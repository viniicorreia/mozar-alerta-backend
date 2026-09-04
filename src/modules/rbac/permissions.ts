import type { UserRole } from "@mozar/types";

/**
 * Every permission the backend checks for, across all sprints — kept in one
 * place so ROLE_PERMISSIONS stays reviewable as a single table. Modules
 * that don't exist yet (news, jobs, ...) reference their future
 * permissions here already so RBAC only needs touching once per role
 * change, not once per module.
 */
export const PERMISSIONS = {
  usersManage: "users:manage", // change role/status of any user
  usersReadSelf: "users:read:self",

  newsCreate: "news:create",
  newsPublish: "news:publish",
  newsModerate: "news:moderate",

  categoriesManage: "categories:manage",
  mediaUpload: "media:upload",

  instagramManage: "instagram:manage",

  jobCreateOwn: "job:create:own",
  applicationReadOwnCompany: "application:read:own-company",
  applicationUpdateOwnCompany: "application:update:own-company",

  candidateUpdateSelf: "candidate:update:self",
  applicationCreate: "application:create",

  adminDashboardView: "admin:dashboard:view",
  auditView: "audit:view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

/**
 * Roles are just named permission bundles — adding a role or a permission
 * only touches this map, never the route handlers that call
 * `requirePermission(...)`.
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  ADMIN: ALL_PERMISSIONS,
  MODERATOR: [
    PERMISSIONS.newsCreate,
    PERMISSIONS.newsPublish,
    PERMISSIONS.newsModerate,
    PERMISSIONS.mediaUpload,
    PERMISSIONS.instagramManage,
    PERMISSIONS.usersReadSelf,
  ],
  COMPANY: [
    PERMISSIONS.jobCreateOwn,
    PERMISSIONS.applicationReadOwnCompany,
    PERMISSIONS.applicationUpdateOwnCompany,
    PERMISSIONS.usersReadSelf,
  ],
  CANDIDATE: [
    PERMISSIONS.candidateUpdateSelf,
    PERMISSIONS.applicationCreate,
    PERMISSIONS.usersReadSelf,
  ],
  USER: [PERMISSIONS.usersReadSelf],
};

export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role] ?? []).includes(permission);
}
