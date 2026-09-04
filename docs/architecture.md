# Arquitetura — Portal Mozarlândia

> **Nota (Sprint 2+):** o sistema foi dividido em dois repositórios —
> este (`mozar-alerta-backend`: API, banco, workers) e
> [`mozar-alerta`](https://github.com/viniicorreia/mozar-alerta)
> (frontend: portal público + admin). Este documento descreve a
> arquitetura do sistema como um todo; ele existe (com pequenas
> divergências aceitáveis) em cópia nos dois repositórios.

Fonte de verdade da arquitetura aprovada. Decisões tomadas nesta ordem:
plano inicial → troca de banco para Supabase (Postgres + Auth + Storage +
RLS) → troca de frontend público para Vite (TanStack Start, SSR) → split
em dois repositórios (backend / frontend).

## 1. Visão geral

Monolito modular no backend (não microserviços — volume não justifica o
custo operacional). Três processos a partir da mesma imagem: `api`
(Fastify, HTTP), `worker` (BullMQ, tarefas assíncronas), `scheduler` (cron →
enfileira jobs). Dois frontends: `web` (portal público, SSR) e `admin`
(painel administrativo, SPA), ambos consumindo a mesma API.

```
Cloudflare (CDN/WAF/DNS)
  ├─ portal.com.br      → apps/web    (TanStack Start, SSR/streaming)
  ├─ admin.portal.com.br→ apps/admin  (Vite SPA)
  └─ api.portal.com.br  → apps/api    (Fastify: api / worker / scheduler)
                              ├─ Supabase (Postgres + Auth + Storage, RLS)
                              ├─ Redis (cache + BullMQ)
                              └─ Meta Graph API / e-mail / IA (plugáveis)
```

## 2. Módulos do backend

`src/modules/*`: auth, rbac, users, categories, news, media,
instagram, moderation, companies, jobs, candidates, resumes, applications,
events, search, notifications, audit, analytics. Um módulo só é acessado
por fora através do seu index/service público (regra de lint dedicada).

`src/platform/*`: infraestrutura transversal — http, db, queue,
cache, storage, mailer, ai, crypto, logger, config. Ver código-fonte para o
contrato de cada um (interfaces `Mailer`, `AIProvider`, `StorageService`).

## 3. Stack

| Camada | Escolha |
|---|---|
| Monorepo | pnpm + Turborepo |
| Portal público | TanStack Start (Vite + SSR/streaming) — exigido pelo SEO (sitemap, OG, meta tags dinâmicas) |
| Admin | Vite SPA (React) — sem necessidade de SSR |
| Backend HTTP | Fastify |
| Banco | **Supabase (Postgres)** — adotado por completo: Auth, Storage, RLS |
| ORM | Drizzle |
| Autorização | RLS (Postgres) como fonte principal + checagem de permissão no backend como segunda camada |
| Filas | BullMQ + Redis, desde o Sprint 0 (não é otimização tardia) |
| Storage | Supabase Storage (buckets `resumes` privado, `covers` público) |
| Testes | Vitest + Supertest + Playwright (E2E) |
| Deploy | Fly.io/Render (api/worker/scheduler) + Vercel (web) + Cloudflare Pages (admin) + Supabase gerenciado |

## 4. Por que Supabase completo (não só o Postgres)

- Menos código de infra: Auth, RLS e Storage prontos tiram um bloco inteiro
  do Sprint 1 e do módulo `platform/storage`.
- RLS vira a fonte única de verdade de autorização por linha (um candidato
  só lê suas próprias `applications`/`resumes`; uma empresa só lê
  `applications` das suas `jobs`).
- Realtime disponível sem custo de arquitetura extra (não usado ainda).

**Trade-offs assumidos conscientemente:**
1. `instagram_sources` (tokens do Meta) não tem NENHUMA policy de
   SELECT/INSERT/UPDATE/DELETE para `authenticated`/`anon` — só
   `service_role` (backend) acessa. RLS "solta" nessa tabela seria o erro
   mais caro possível nesta arquitetura.
2. Lógica de negócio complexa (sync do Instagram, moderação, expiração de
   vaga, agregações) roda no `worker`/`api` com a service role key — RLS
   protege o acesso direto do cliente, não substitui o backend.
3. TanStack Start é mais novo que Next.js; fallback é Vike se travar.

## 5. Schema de dados

Definido em código: `db/src/schema/*.ts`
(Drizzle) + `db/sql/*.sql` (RLS, triggers,
storage policies, aplicados por `pnpm db:migrate` via
`db/src/migrate.ts`, depois das migrations do drizzle-kit).

Tabelas: `users` (espelho de `auth.users`), `user_consents`, `candidates` +
`candidate_education`/`candidate_experience`, `companies`, `categories`,
`news`, `instagram_sources` (sensível), `instagram_posts`, `jobs`,
`resumes`, `applications` + `application_status_history`, `events`,
`notifications`, `audit_log`.

Pontos notáveis:
- `jobs`: policy de escrita da empresa exige `companies.status = 'active'
  and companies.verified_at is not null` — auto-cadastro é livre, mas só
  publica vaga após verificação do admin (decisão registrada).
- `applications`: `UNIQUE(job_id, candidate_id)` no banco impede
  candidatura duplicada sob concorrência; trigger
  `guard_application_status_transition` impõe a máquina de estados
  (candidato só pode mover para `withdrawn`; empresa não reabre uma
  candidatura retirada).
- Storage `resumes`: bucket privado, path `resumes/{candidate_user_id}/*`,
  policy de leitura da empresa via join em `applications`; download real
  sempre por signed URL de TTL curto pedida ao backend.

## 6. Fluxo de autenticação

Supabase Auth (e-mail/senha) emite o JWT; `apps/api` só valida esse token e
popula `req.user`. RBAC é permission-based (roles são agrupamentos):
`ADMIN` (tudo), `MODERATOR` (moderação de notícias/instagram), `COMPANY`
(`:own`), `CANDIDATE` (`:self`), `USER` (público autenticado). Checagem de
ownership vive em duas camadas: RLS (Postgres) e services do backend.

## 7. Integração Meta/Instagram (verificado set/2026)

Só é possível monitorar contas **Business/Creator que autorizaram o app via
OAuth** (Instagram Business Login) — não existe endpoint oficial para ler
qualquer perfil arbitrário; a Basic Display API foi descontinuada. Decisão
registrada: **MVP usa somente fontes `owned`** (contas próprias/parceiras).
Token de acesso: long-lived, 60 dias, renovável após 24h de vida (job
diário renova a partir de D-10 do vencimento). `instagram_sources` cifra o
token (AES-256-GCM) e não é legível via RLS — ver seção 4.

Fluxo de sync: `scheduler` enfileira `instagram.sync` por fonte ativa →
`worker` busca mídia paginada, deduplica por `(source_id, ig_media_id)`,
baixa e re-hospeda mídia no Storage (URLs da Meta expiram em horas), grava
`instagram_posts` com `moderation_status = 'imported'`.

## 8. Moderação e IA

Todo conteúdo do Instagram entra como `pending_review` na central de
moderação — nunca publica automaticamente. Interface `AIProvider`
(`src/platform/ai`) só preenche campos `ai*` (resumo, categoria
sugerida, sensibilidade, prioridade); nunca muda status para `published`.
Categorias sensíveis (`political`, `crime`, `health`, `accident`,
`accusation`) sempre exigem aprovação humana explícita, reforçado no código
de moderação, não só na UI. Decisão registrada: MVP roda com
`AI_PROVIDER=noop` — driver plugável, troca por env var quando decidirem
ligar um provedor real.

## 9. Candidatura a vagas

Upload de currículo (PDF, magic-bytes + MIME + tamanho + ClamAV) →
`resumes` no bucket privado → `POST /jobs/:id/apply` cria `applications`
(bloqueado por `UNIQUE(job_id, candidate_id)`) → evento notifica a empresa
→ empresa move status (`applied → screening → interview → approved/
rejected`) respeitando a máquina de estados do trigger.

## 10. Segurança

argon2/JWT geridos pelo Supabase Auth; RLS como autorização primária;
segredos do Meta cifrados e isolados do RLS; upload validado
(magic-bytes/MIME/tamanho/antivírus); sanitização de HTML em notícias
(XSS); rate limiting (`@fastify/rate-limit`); headers via `@fastify/helmet`;
CORS restrito a `PUBLIC_WEB_URL`/`PUBLIC_ADMIN_URL`; erro global nunca
vaza stack trace (`platform/http/error-handler.ts`); auditoria via
`audit_log`; LGPD (consentimento versionado, exclusão de conta/currículo,
retenção).

## 11. Deploy

Decisão registrada: **Fly.io/Render** (api/worker/scheduler) + **Vercel**
(web) + **Cloudflare R2 ou Supabase Storage** + **Cloudflare Pages**
(admin) + **Supabase gerenciado** (Postgres/Auth/Storage). Caminho de
migração para AWS (ECS Fargate) mapeado para quando o volume pedir — não
implementado agora.

## 12. Roadmap (sprints de 2 semanas)

- **Sprint 0 — Fundação** ✅: monorepo, packages compartilhados, schema + RLS,
  Fastify boot, `/health`, CI, Docker, docker-compose local.
- **Sprint 1 — Auth + RBAC + Users** ✅: plugin de auth (`src/modules/auth`)
  valida o access token do Supabase a cada request e popula `request.user`
  a partir de `public.users` (role/status refletem mudança no request
  seguinte, não esperam refresh de token); RBAC permission-based
  (`modules/rbac`) com `requirePermission(...)`; `modules/users` com
  `GET/PATCH /users/me`, pedido de exclusão (LGPD) e
  `PATCH /admin/users/:id/role` (admin-only); `modules/audit` como único
  caminho de escrita em `audit_log`. Regra de lint de fronteira de módulo
  corrigida para pegar de fato imports relativos entre módulos irmãos.
- **Sprint 2 — Categorias + Notícias (core) + Media** ✅: CRUD completo de
  categorias e notícias (slug server-side, sanitização de HTML, ciclo
  draft/scheduled/published/archived, agendamento via job repetível
  BullMQ), upload de imagem com variantes via sharp. Admin: design system em
  `packages/ui`, telas de login/categorias/notícias com tabelas, diálogos,
  toasts e upload — validado num navegador real contra o Supabase de
  produção (achou e corrigiu 2 bugs reais: schema de categoria exigindo
  campos server-derived, e o SDK mandando `Content-Type: application/json`
  em requests sem corpo, quebrando publish/unpublish só no browser).
- **Sprint 3** — Portal público (TanStack Start) + SEO.
- **Sprint 4** — Instagram: OAuth + Sources.
- **Sprint 5** — Instagram: Sync + Moderação.
- **Sprint 6** — Camada de IA (plugável, opcional).
- **Sprint 7** — Empresas + Vagas.
- **Sprint 8** — Candidatos + Currículos + Candidaturas.
- **Sprint 9** — Notificações + Eventos + Busca.
- **Sprint 10** — Dashboard + Analytics + Auditoria.
- **Sprint 11** — Segurança + Performance + Hardening.
- **Sprint 12** — Deploy produção + Observabilidade.
