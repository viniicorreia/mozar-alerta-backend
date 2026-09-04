# Portal Mozarlândia — Backend

API (Fastify), banco (Supabase/Postgres via Drizzle) e workers para o
portal de notícias, empregos e informações da cidade de Mozarlândia-GO.

O frontend (portal público + painel admin) vive em um repositório
separado: [mozar-alerta](https://github.com/viniicorreia/mozar-alerta).
Arquitetura completa do sistema (os dois repos) em
[`docs/architecture.md`](docs/architecture.md).

## 🚀 Rodando o projeto completo (backend + frontend)

Este repo sozinho já sobe e responde `/health`, mas pra ver o portal e o
admin funcionando é preciso subir o frontend também. Ordem recomendada:

### 1. Clonar os dois repositórios lado a lado

```bash
git clone git@github.com:viniicorreia/mozar-alerta-backend.git
git clone git@github.com:viniicorreia/mozar-alerta.git
```

### 2. Criar (ou reaproveitar) um projeto Supabase

Um único projeto Supabase serve os dois repos. Se ainda não tem um, crie
grátis em [supabase.com/dashboard](https://supabase.com/dashboard) →
**New project** e guarde a senha do Postgres.

Em **Settings → API**, anote `Project URL`, a chave `anon`/`publishable`
e a `service_role` (secreta). Em **Settings → Database → Connection
string → URI**, anote a `DATABASE_URL`.

### 3. Subir este repo (backend)

```bash
cd mozar-alerta-backend
pnpm install
cp .env.example .env        # preencha com os dados do passo 2
pnpm db:migrate              # aplica schema + RLS no Supabase
pnpm dev                     # API em http://localhost:3333
```

Confirme: `curl http://localhost:3333/health` → `{"status":"ok"}`.

### 4. Subir o frontend

```bash
cd ../mozar-alerta
pnpm install
cp apps/admin/.env.example apps/admin/.env
```

Preencha `apps/admin/.env`:

```env
VITE_API_URL=http://localhost:3333
VITE_SUPABASE_URL=...                    # mesma URL do passo 2
VITE_SUPABASE_PUBLISHABLE_KEY=...        # chave anon/publishable do passo 2
```

```bash
pnpm dev            # web em :3000, admin em :5173
```

Detalhes completos do frontend no
[README dele](https://github.com/viniicorreia/mozar-alerta#readme).

### 5. Criar seu usuário admin

O admin ainda não tem tela de cadastro — só login. Crie a conta via API
do Supabase Auth e promova a `ADMIN`:

```bash
curl -X POST "$SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"voce@example.com","password":"SenhaForte123!"}'
```

```sql
-- Supabase Studio → SQL Editor, ou psql com a DATABASE_URL
update public.users set role = 'ADMIN', status = 'active'
where email = 'voce@example.com';
```

Por padrão o Supabase exige confirmação de e-mail antes de emitir sessão
— para testar sem clicar no link, desative em **Authentication →
Providers → Email → Confirm email** (só em dev).

---

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
