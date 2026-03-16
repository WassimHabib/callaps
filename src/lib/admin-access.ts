import { prisma } from "./prisma";
import { getOrgContext } from "./auth";

export type AdminPermission = "owner" | "manage" | "read" | null;

export interface AdminAccessResult {
  access: boolean;
  permission: AdminPermission;
}

/**
 * Check if an admin can access a specific client.
 * Super admins always have owner-level access.
 */
export async function canAccessClient(
  adminId: string,
  clientId: string,
  isSuperAdmin = false
): Promise<AdminAccessResult> {
  if (isSuperAdmin) {
    return { access: true, permission: "owner" };
  }

  // Check ownership
  const adminClient = await prisma.adminClient.findUnique({
    where: { adminId_clientId: { adminId, clientId } },
  });

  if (adminClient) {
    return { access: true, permission: "owner" };
  }

  // Check shared access
  const shared = await prisma.adminClientShare.findFirst({
    where: {
      sharedWithId: adminId,
      adminClient: { clientId },
    },
  });

  if (shared) {
    return {
      access: true,
      permission: shared.permission as "read" | "manage",
    };
  }

  return { access: false, permission: null };
}

/**
 * Get the OrgContext and verify the user is an admin.
 * Returns the context or throws.
 */
export async function requireAdminPortal() {
  const ctx = await getOrgContext();
  if (ctx.userRole !== "admin" && ctx.userRole !== "super_admin") {
    throw new Error("Accès réservé aux administrateurs");
  }
  return ctx;
}

/**
 * Verify admin has at least the required permission level on a client.
 * Permission hierarchy: owner > manage > read
 */
export function hasMinPermission(
  current: AdminPermission,
  required: "owner" | "manage" | "read"
): boolean {
  if (!current) return false;
  const levels: Record<string, number> = { read: 1, manage: 2, owner: 3 };
  return (levels[current] ?? 0) >= (levels[required] ?? 0);
}

/**
 * Get all client IDs accessible to an admin.
 * Used for listing and dashboard queries.
 */
export async function getAccessibleClientIds(
  adminId: string,
  isSuperAdmin = false
): Promise<string[]> {
  if (isSuperAdmin) {
    const all = await prisma.adminClient.findMany({
      select: { clientId: true },
    });
    return all.map((a) => a.clientId);
  }

  const [owned, shared] = await Promise.all([
    prisma.adminClient.findMany({
      where: { adminId },
      select: { clientId: true },
    }),
    prisma.adminClientShare.findMany({
      where: { sharedWithId: adminId },
      select: { adminClient: { select: { clientId: true } } },
    }),
  ]);

  const ids = new Set<string>();
  for (const o of owned) ids.add(o.clientId);
  for (const s of shared) ids.add(s.adminClient.clientId);
  return Array.from(ids);
}

/**
 * Get all clientOrgIds accessible to an admin.
 * Used for billing queries (Subscription/Invoice use orgId).
 */
export async function getAccessibleClientOrgIds(
  adminId: string,
  isSuperAdmin = false
): Promise<string[]> {
  if (isSuperAdmin) {
    const all = await prisma.adminClient.findMany({
      select: { clientOrgId: true },
    });
    return all.map((a) => a.clientOrgId);
  }

  const [owned, shared] = await Promise.all([
    prisma.adminClient.findMany({
      where: { adminId },
      select: { clientOrgId: true },
    }),
    prisma.adminClientShare.findMany({
      where: { sharedWithId: adminId },
      select: { adminClient: { select: { clientOrgId: true } } },
    }),
  ]);

  const ids = new Set<string>();
  for (const o of owned) ids.add(o.clientOrgId);
  for (const s of shared) ids.add(s.adminClient.clientOrgId);
  return Array.from(ids);
}
