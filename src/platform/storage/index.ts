import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../config/env.js";

export interface StorageService {
  upload(
    bucket: string,
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<{ path: string }>;
  createSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string>;
  remove(bucket: string, path: string): Promise<void>;
}

/** Thin wrapper over Supabase Storage — always called with the service role client (server-only). */
export function createStorageService(client: SupabaseClient): StorageService {
  return {
    async upload(bucket, path, file, contentType) {
      const { error } = await client.storage
        .from(bucket)
        .upload(path, file, { contentType, upsert: false });
      if (error) throw error;
      return { path };
    },
    async createSignedUrl(bucket, path, expiresInSeconds) {
      const { data, error } = await client.storage
        .from(bucket)
        .createSignedUrl(path, expiresInSeconds);
      if (error) throw error;
      return data.signedUrl;
    },
    async remove(bucket, path) {
      const { error } = await client.storage.from(bucket).remove([path]);
      if (error) throw error;
    },
  };
}

let serviceClient: SupabaseClient | undefined;

/** Server-only Supabase client using the service role key. Bypasses RLS — never expose to the frontend. */
export function getSupabaseServiceClient(env: Env): SupabaseClient {
  if (!serviceClient) {
    serviceClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return serviceClient;
}
