import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const client = postgres(connectionString, { max: 1, prepare: false });
  const db = drizzle(client);

  console.log("→ running drizzle-kit migrations (tables, enums, indexes)...");
  await migrate(db, { migrationsFolder: join(__dirname, "../migrations") });

  console.log("→ applying raw SQL (RLS policies, triggers, storage)...");
  const sqlDir = join(__dirname, "../sql");
  const files = readdirSync(sqlDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    console.log(`  - ${file}`);
    const content = readFileSync(join(sqlDir, file), "utf-8");
    await client.unsafe(content);
  }

  console.log("✓ migration complete");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
