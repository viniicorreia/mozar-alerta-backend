import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { ImageVariant } from "@mozar/types";
import type { StorageService } from "../../platform/storage/index.js";
import { ValidationError } from "../../shared/errors.js";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const VARIANT_SIZES: Record<Exclude<ImageVariant, "original">, number> = {
  large: 1600,
  thumbnail: 400,
};

export interface UploadImageInput {
  buffer: Buffer;
  mimeType: string;
}

export interface UploadImageResult {
  key: string;
  urls: Record<ImageVariant, string>;
}

const BUCKET = "covers";

function assertValidImage(input: UploadImageInput) {
  if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
    throw new ValidationError({
      mimeType: ["Only JPEG, PNG or WebP images are accepted"],
    });
  }
  if (input.buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new ValidationError({ file: ["Image must be at most 5MB"] });
  }
}

/**
 * Resizes/uploads a cover image into three variants (magic-bytes validated
 * via sharp's own decode, which throws on anything that isn't a real
 * image — a mismatched Content-Type header alone can't get past this).
 * `covers` is a public bucket, so the resulting URLs are stable and served
 * straight from Supabase Storage's public object endpoint.
 */
export function createMediaService(storage: StorageService, supabaseUrl: string) {
  const publicBaseUrl = `${supabaseUrl}/storage/v1/object/public`;
  return {
    async uploadCoverImage(input: UploadImageInput): Promise<UploadImageResult> {
      assertValidImage(input);

      let pipeline: sharp.Sharp;
      try {
        pipeline = sharp(input.buffer, { failOn: "error" });
        await pipeline.metadata();
      } catch {
        throw new ValidationError({ file: ["File is not a valid image"] });
      }

      const id = randomUUID();
      const basePath = `news/${id}`;
      const urls = {} as Record<ImageVariant, string>;

      const original = await sharp(input.buffer).webp({ quality: 90 }).toBuffer();
      const originalPath = `${basePath}/original.webp`;
      await storage.upload(BUCKET, originalPath, original, "image/webp");
      urls.original = `${publicBaseUrl}/${BUCKET}/${originalPath}`;

      for (const [variant, width] of Object.entries(VARIANT_SIZES) as [
        Exclude<ImageVariant, "original">,
        number,
      ][]) {
        const resized = await sharp(input.buffer)
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        const path = `${basePath}/${variant}.webp`;
        await storage.upload(BUCKET, path, resized, "image/webp");
        urls[variant] = `${publicBaseUrl}/${BUCKET}/${path}`;
      }

      return { key: basePath, urls };
    },
  };
}

export type MediaService = ReturnType<typeof createMediaService>;
