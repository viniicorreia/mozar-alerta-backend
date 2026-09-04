# Modules

`auth`, `rbac`, `users`, `audit` are filled in as of Sprint 1. Everything
else stays empty on purpose until its own sprint (see `docs/architecture.md`).

A module only talks to another module through its exported index — never
by importing another module's internals directly. This is enforced by the
`no-restricted-imports` rule in the repo's root `eslint.config.js`; try
importing e.g. `../users/users.service.js` from another module and `pnpm
lint` will fail.

- **auth** — verifies the Supabase access token on every request
  (`authPlugin`, best-effort: a missing/invalid token just leaves
  `request.user` null) and exposes `app.authenticate` as an opt-in
  preHandler. Role/status come from `public.users`, not JWT claims, so a
  role change takes effect on the next request.
- **rbac** — `PERMISSIONS` + `ROLE_PERMISSIONS` (role = named permission
  bundle) and `requirePermission(permission)`, a preHandler factory.
  Ownership checks (`:own`, `:self`) stay in the route/service and are
  reinforced again at the database via RLS (defense in depth).
- **users** — self-service profile (`GET/PATCH /users/me`, LGPD deletion
  request) and admin role management (`PATCH /admin/users/:id/role`,
  gated by `PERMISSIONS.usersManage`).
- **audit** — single write path to `audit_log` (`createAuditService`);
  every module that mutates something sensitive calls `.record(...)`
  instead of writing to the table directly.
