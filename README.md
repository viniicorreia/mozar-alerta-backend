# Portal Mozarlândia — Backend

API (Fastify), banco (Supabase/Postgres via Drizzle) e workers para o
portal de notícias, empregos e informações da cidade de Mozarlândia-GO.

O frontend (portal público + painel admin) vive em um repositório
separado: [mozar-alerta](https://github.com/viniicorreia/mozar-alerta).
Arquitetura completa do sistema (os dois repos) em
[`docs/architecture.md`](docs/architecture.md).

## Stack

- **Fastify** rodando três processos a partir da mesma imagem: `api`
  (HTTP), `worker` (BullMQ), `scheduler` (cron → enfileira jobs)
- **Supabase** (Postgres + Auth + Storage, RLS como camada de autorização)
- **Drizzle** — schema (`/db`) + migrations + policies RLS
- **Redis + BullMQ** — filas e cache

## Estrutura

```
src/
  main.ts / worker.ts / scheduler.ts   # entrypoints dos 3 processos
  platform/     # infra transversal: http, db, queue, cache, storage,
                # mailer, ai, crypto, logger, config
  modules/      # um diretório por domínio (auth, news, categories, ...)
  shared/       # erros, slug, helpers de db
test/
db/             # pacote @mozar/db — schema Drizzle, migrations, RLS/SQL
types/          # pacote @mozar/types — schemas Zod compartilhados
                # (duplicado manualmente no repo do frontend — ver nota
                # abaixo)
```

Cada módulo em `src/modules/*` só é acessado por fora através do seu
`index.ts` — nunca importando arquivos internos de outro módulo
diretamente (regra de lint em `eslint.config.js`).

### Sobre `types/` (schemas compartilhados)

Este pacote define o contrato da API (schemas Zod de request/response). O
repositório do frontend mantém sua **própria cópia** de
`packages/types` — não há publicação/sincronização automática por
enquanto (decisão consciente para evitar overhead de infraestrutura numa
fase inicial). **Ao mudar um schema aqui, replique a mudança equivalente
no `packages/types` do repo do frontend.** Se o número de endpoints
crescer e isso começar a doer, a evolução natural é publicar `types` como
pacote versionado (npm/GitHub Packages) consumido pelos dois repos.

## Pré-requisitos

- Node 20+ (`nvm use`)
- pnpm 9 — `corepack enable && corepack prepare pnpm@9.15.0 --activate`
- Uma conta no [Supabase](https://supabase.com) (grátis)
- Docker, apenas se for usar Redis local (`docker-compose.yml`)

## Primeira execução

```bash
pnpm install
cp .env.example .env
# preencha DATABASE_URL / SUPABASE_URL / SUPABASE_ANON_KEY /
# SUPABASE_SERVICE_ROLE_KEY (do seu projeto Supabase) e gere
# SECRETS_ENCRYPTION_KEY com `openssl rand -base64 32`

docker compose up -d          # Redis + Mailhog (opcional para começar)

pnpm db:migrate                # aplica schema + RLS + triggers + storage buckets

pnpm dev                       # API em :3333
pnpm dev:worker                # worker (precisa de Redis)
pnpm dev:scheduler             # scheduler (precisa de Redis)
```

Conferir que subiu:

```bash
curl http://localhost:3333/health           # {"status":"ok"}
curl http://localhost:3333/health/database  # confirma conexão real com o Postgres
curl -i http://localhost:3333/users/me      # 401 sem token (esperado)
```

## Scripts úteis

| Comando | O que faz |
|---|---|
| `pnpm dev` / `dev:worker` / `dev:scheduler` | roda cada processo em modo dev |
| `pnpm build` / `pnpm lint` / `pnpm typecheck` / `pnpm test` | build/lint/typecheck/test de tudo (src + db + types) |
| `pnpm db:generate` | builda `db/` e gera uma nova migration Drizzle a partir de `db/src/schema` |
| `pnpm db:migrate` | aplica migrations Drizzle + `db/sql/*.sql` (RLS, triggers, storage) |
| `pnpm db:studio` | abre o Drizzle Studio apontando pro `DATABASE_URL` do `.env` |

## Segurança

- Nunca commitar `.env` — apenas `.env.example`.
- `SUPABASE_SERVICE_ROLE_KEY` é secreta: só o backend a usa.
- `instagram_sources` não tem policy de leitura para `authenticated`/`anon`:
  só o backend (service role) acessa tokens do Meta.
- CI roda `gitleaks` em todo PR.

## Roadmap

Ver `docs/architecture.md`.
