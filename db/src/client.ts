import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

export type Database = ReturnType<typeof createDb>;

/**
 * Creates a Drizzle client backed by the Supabase Postgres instance.
 *
 * IMPORTANT: this client uses the DATABASE_URL connection string (service
 * role / direct DB access) and therefore BYPASSES Row Level Security.
 * It must only ever run in trusted server contexts (apps/api — api, worker,
 * scheduler processes), never in a browser or edge function reachable by
 * end users.
 */
export function createDb(connectionString: string) {
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

export { schema };
