import type { FastifyInstance } from "fastify";
import { PERMISSIONS, requirePermission } from "../rbac/index.js";
import { getSupabaseServiceClient, createStorageService } from "../../platform/storage/index.js";
import { ValidationError } from "../../shared/errors.js";
import { createMediaService } from "./media.service.js";

export async function mediaRoutes(app: FastifyInstance) {
  const storage = createStorageService(getSupabaseServiceClient(app.env));
  const media = createMediaService(storage, app.env.SUPABASE_URL);

  app.post(
    "/media/images",
    { preHandler: [app.authenticate, requirePermission(PERMISSIONS.mediaUpload)] },
    async (request, reply) => {
      const file = await request.file();
      if (!file) {
        throw new ValidationError({ file: ["No file was sent"] });
      }
      const buffer = await file.toBuffer();
      const result = await media.uploadCoverImage({
        buffer,
        mimeType: file.mimetype,
      });
      return reply.status(201).send({ success: true, data: result });
    },
  );
}
