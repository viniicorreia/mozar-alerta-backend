import { createDb, schema, type Database } from "@mozar/db";
import type { Env } from "../config/env.js";

export { schema };
export type { Database };

let db: Database | undefined;

/** Singleton Drizzle client for the process (api / worker / scheduler). */
export function getDb(env: Env): Database {
  if (!db) {
    db = createDb(env.DATABASE_URL);
  }
  return db;
}
