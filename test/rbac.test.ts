import { describe, expect, it } from "vitest";
import { PERMISSIONS, ROLE_PERMISSIONS, roleHasPermission } from "../src/modules/rbac/index.js";

describe("roleHasPermission", () => {
  it("ADMIN has every permission that exists", () => {
    const allPermissions = Object.values(PERMISSIONS);
    for (const permission of allPermissions) {
      expect(roleHasPermission("ADMIN", permission)).toBe(true);
    }
  });

  it("USER only has the baseline self-read permission", () => {
    expect(roleHasPermission("USER", PERMISSIONS.usersReadSelf)).toBe(true);
    expect(roleHasPermission("USER", PERMISSIONS.usersManage)).toBe(false);
    expect(roleHasPermission("USER", PERMISSIONS.newsPublish)).toBe(false);
  });

  it("MODERATOR can moderate/publish news but cannot manage users", () => {
    expect(roleHasPermission("MODERATOR", PERMISSIONS.newsModerate)).toBe(true);
    expect(roleHasPermission("MODERATOR", PERMISSIONS.newsPublish)).toBe(true);
    expect(roleHasPermission("MODERATOR", PERMISSIONS.usersManage)).toBe(false);
  });

  it("COMPANY cannot create news or manage other companies' applications", () => {
    expect(roleHasPermission("COMPANY", PERMISSIONS.jobCreateOwn)).toBe(true);
    expect(roleHasPermission("COMPANY", PERMISSIONS.newsCreate)).toBe(false);
  });

  it("every role in ROLE_PERMISSIONS is a subset of the full permission set", () => {
    const allPermissions = new Set(Object.values(PERMISSIONS));
    for (const permissions of Object.values(ROLE_PERMISSIONS)) {
      for (const permission of permissions) {
        expect(allPermissions.has(permission)).toBe(true);
      }
    }
  });
});
