import { z } from "zod";

export const IMAGE_VARIANTS = ["original", "large", "thumbnail"] as const;
export type ImageVariant = (typeof IMAGE_VARIANTS)[number];

export const uploadImageResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    key: z.string(),
    urls: z.object({
      original: z.string().url(),
      large: z.string().url(),
      thumbnail: z.string().url(),
    }),
  }),
});
export type UploadImageResponse = z.infer<typeof uploadImageResponseSchema>;
