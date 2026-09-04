import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run drizzle-kit");
}

export default defineConfig({
  // Points at the compiled output, not ./src/schema/*.ts: our source uses
  // NodeNext-style explicit ".js" specifiers for relative imports (they
  // refer to the sibling .ts file at the type level, resolved to real .js
  // at runtime by tsc). drizzle-kit's own CJS loader resolves those
  // specifiers literally and fails to find e.g. "./enums.js" next to
  // enums.ts. Run `pnpm build` before `pnpm db:generate`.
  schema: "./dist/schema/*.js",
  out: "./migrations",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
