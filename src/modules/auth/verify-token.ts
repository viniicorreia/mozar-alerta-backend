import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../../platform/config/env.js";

let anonClient: SupabaseClient | undefined;

/**
 * Client-less (anon key) Supabase client used ONLY to validate access
 * tokens against GoTrue. Deliberately not the service-role client — this
 * path must never be able to do anything but confirm "is this token valid,
 * and for whom".
 */
function getAnonClient(env: Env): SupabaseClient {
  if (!anonClient) {
    anonClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return anonClient;
}

export interface VerifiedToken {
  supabaseUserId: string;
  email: string;
}

/**
 * Verifies a bearer access token by asking Supabase Auth to resolve it —
 * simple and correct for Sprint 1. If per-request latency becomes a
 * concern (Sprint 11 perf pass), this is the seam to swap in local JWKS
 * verification with a short-lived cache, without touching call sites.
 */
export async function verifySupabaseToken(
  env: Env,
  accessToken: string,
): Promise<VerifiedToken | null> {
  const client = getAnonClient(env);
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user || !data.user.email) {
    return null;
  }
  return { supabaseUserId: data.user.id, email: data.user.email };
}
