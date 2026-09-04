import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export interface EncryptedSecret {
  cipher: Buffer;
  iv: Buffer;
  tag: Buffer;
}

/**
 * Encrypts a secret (e.g. a Meta/Instagram long-lived access token) with
 * AES-256-GCM using SECRETS_ENCRYPTION_KEY. Used exclusively for
 * `instagram_sources.access_token_cipher` — never for passwords (those are
 * handled entirely by Supabase Auth).
 */
export function encryptSecret(plaintext: string, keyBase64: string): EncryptedSecret {
  const key = Buffer.from(keyBase64, "base64");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  return { cipher: encrypted, iv, tag: cipher.getAuthTag() };
}

export function decryptSecret(secret: EncryptedSecret, keyBase64: string): string {
  const key = Buffer.from(keyBase64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, secret.iv);
  decipher.setAuthTag(secret.tag);
  const decrypted = Buffer.concat([decipher.update(secret.cipher), decipher.final()]);
  return decrypted.toString("utf-8");
}
