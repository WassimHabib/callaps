import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { OrgRole } from "@/lib/permissions";

export type UserRole = "admin" | "client" | "super_admin";
export type EffectiveRole = OrgRole | "super_admin";

export interface OrgContext {
  userId: string;       // DB user ID
  clerkId: string;      // Clerk user ID
  orgId: string | null; // Clerk org ID (null for super_admin without impersonation)
  role: EffectiveRole;
  isImpersonating: boolean;
  isSuperAdmin: boolean;
}

export async function getUserRole(): Promise<UserRole> {
  const { sessionClaims } = await auth();
  return (sessionClaims?.metadata as { role?: UserRole })?.role || "client";
}

export async function requireAdmin() {
  const role = await getUserRole();
  if (role !== "admin" && role !== "super_admin") {
    throw new Error("Unauthorized: admin access required");
  }
}

export async function requireSuperAdmin() {
  const role = await getUserRole();
  if (role !== "super_admin") {
    throw new Error("Unauthorized: super admin access required");
  }
}

export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

/**
 * Get the organization context for the current request.
 * For super_admin: returns impersonated org if cookie is set, otherwise orgId is null.
 * For regular users: returns their active Clerk organization and role.
 */
export async function getOrgContext(): Promise<OrgContext> {
  const { userId: clerkId, orgId: clerkOrgId, orgRole } = await auth();

  if (!clerkId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  // Check if super_admin
  if (user.role === "super_admin") {
    const cookieStore = await cookies();
    const impersonatedOrg = cookieStore.get("impersonate_org")?.value;

    return {
      userId: user.id,
      clerkId,
      orgId: impersonatedOrg || null,
      role: "super_admin",
      isImpersonating: !!impersonatedOrg,
      isSuperAdmin: true,
    };
  }

  // Regular user — use Clerk org
  const orgId = clerkOrgId || null;
  const role = (orgRole as OrgRole) || "viewer";

  return {
    userId: user.id,
    clerkId,
    orgId,
    role,
    isImpersonating: false,
    isSuperAdmin: false,
  };
}

/**
 * Build a Prisma `where` filter scoped to the current org.
 * Super admins without impersonation see everything (returns {}).
 */
export function orgFilter(ctx: OrgContext): { orgId?: string } {
  if (ctx.isSuperAdmin && !ctx.isImpersonating) {
    return {}; // No filter — super admin sees all
  }
  if (!ctx.orgId) {
    return { orgId: "___none___" }; // Safety: no org = no data
  }
  return { orgId: ctx.orgId };
}
