import { eq } from "drizzle-orm";
import type { Database } from "../../platform/db/index.js";
import { schema } from "../../platform/db/index.js";
import { NotFoundError } from "../../shared/errors.js";
import type { UserRole } from "@mozar/types";

export function createUsersService(db: Database) {
  return {
    async getById(id: string) {
      const [row] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .limit(1);
      if (!row) throw new NotFoundError("User", id);
      return row;
    },

    async updateName(id: string, name: string) {
      const [row] = await db
        .update(schema.users)
        .set({ name })
        .where(eq(schema.users.id, id))
        .returning();
      if (!row) throw new NotFoundError("User", id);
      return row;
    },

    async requestDeletion(id: string) {
      const [row] = await db
        .update(schema.users)
        .set({ deletionRequestedAt: new Date() })
        .where(eq(schema.users.id, id))
        .returning();
      if (!row) throw new NotFoundError("User", id);
      return row;
    },

    /** Admin-only — role changes never happen through the self-service update path. */
    async updateRole(id: string, role: UserRole) {
      const [row] = await db
        .update(schema.users)
        .set({ role })
        .where(eq(schema.users.id, id))
        .returning();
      if (!row) throw new NotFoundError("User", id);
      return row;
    },
  };
}

export type UsersService = ReturnType<typeof createUsersService>;
