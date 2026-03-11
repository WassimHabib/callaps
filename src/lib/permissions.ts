export type OrgRole = "org_admin" | "manager" | "operator" | "viewer";

export type Permission =
  | "agents:read"
  | "agents:create"
  | "agents:update"
  | "agents:delete"
  | "agents:publish"
  | "campaigns:read"
  | "campaigns:create"
  | "campaigns:update"
  | "campaigns:delete"
  | "campaigns:launch"
  | "members:read"
  | "members:invite"
  | "members:remove"
  | "members:update_role"
  | "analytics:read"
  | "billing:read"
  | "billing:manage"
  | "phone_numbers:read"
  | "phone_numbers:manage"
  | "integrations:read"
  | "integrations:manage"
  | "contacts:read"
  | "contacts:create"
  | "contacts:update"
  | "contacts:delete"
  | "appointments:read"
  | "appointments:manage";

const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  org_admin: [
    "agents:read", "agents:create", "agents:update", "agents:delete", "agents:publish",
    "campaigns:read", "campaigns:create", "campaigns:update", "campaigns:delete", "campaigns:launch",
    "members:read", "members:invite", "members:remove", "members:update_role",
    "analytics:read",
    "billing:read", "billing:manage",
    "phone_numbers:read", "phone_numbers:manage",
    "integrations:read", "integrations:manage",
    "contacts:read", "contacts:create", "contacts:update", "contacts:delete",
    "appointments:read", "appointments:manage",
  ],
  manager: [
    "agents:read", "agents:create", "agents:update", "agents:delete", "agents:publish",
    "campaigns:read", "campaigns:create", "campaigns:update", "campaigns:delete", "campaigns:launch",
    "analytics:read",
    "phone_numbers:read", "phone_numbers:manage",
    "integrations:read", "integrations:manage",
    "contacts:read", "contacts:create", "contacts:update", "contacts:delete",
    "appointments:read", "appointments:manage",
  ],
  operator: [
    "agents:read",
    "campaigns:read", "campaigns:launch",
    "analytics:read",
    "phone_numbers:read",
    "contacts:read",
    "appointments:read",
  ],
  viewer: [
    "agents:read",
    "campaigns:read",
    "analytics:read",
    "contacts:read",
    "appointments:read",
  ],
};

export function hasPermission(role: OrgRole | "super_admin", permission: Permission): boolean {
  if (role === "super_admin") return true;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: OrgRole | "super_admin"): Permission[] {
  if (role === "super_admin") {
    return Object.values(ROLE_PERMISSIONS).flat().filter((v, i, a) => a.indexOf(v) === i);
  }
  return ROLE_PERMISSIONS[role] ?? [];
}
