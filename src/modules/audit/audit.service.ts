import type { Database } from "../../platform/db/index.js";
import { schema } from "../../platform/db/index.js";

export interface RecordAuditInput {
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  entity: string;
  entityId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: unknown;
}

/**
 * Single write path to `audit_log` (plan §21). Every module that mutates
 * something sensitive (role changes, publish/unpublish, moderation
 * decisions, Instagram source changes, application status changes) calls
 * this instead of writing to the table directly.
 */
export function createAuditService(db: Database) {
  return {
    async record(input: RecordAuditInput): Promise<void> {
      await db.insert(schema.auditLog).values({
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        ip: input.ip,
        userAgent: input.userAgent,
        metadata: input.metadata,
      });
    },
  };
}

export type AuditService = ReturnType<typeof createAuditService>;
