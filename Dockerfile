# syntax=docker/dockerfile:1
FROM node:20-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml* package.json ./
COPY db/package.json db/package.json
COPY types/package.json types/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo/dist ./dist
COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/db ./db
COPY --from=build /repo/types ./types
COPY --from=build /repo/node_modules ./node_modules

EXPOSE 3333
# Command is overridden per-process in docker-compose: api | worker | scheduler
CMD ["node", "dist/main.js"]
