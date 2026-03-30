import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/jwt";
import type { OrgRole } from "@/lib/permissions";
import { cache } from "react";

export type UserRole = "admin" | "client" | "super_admin";
export type EffectiveRole = OrgRole | "super_admin";

export interface OrgContext {
  userId: string;
  userName: string;
  userRole: UserRole;
  orgId: string | null;
  role: EffectiveRole;
  isImpersonating: boolean;
  isSuperAdmin: boolean;
  approved: boolean;
}

/**
 * Core auth function — cached per request.
 * One single DB query for the entire request lifecycle.
 */
export const getOrgContext = cache(async (): Promise<OrgContext> => {
  const session = await verifySession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Super admin
  if (user.role === "super_admin") {
    const cookieStore = await cookies();
    const impersonatedOrg = cookieStore.get("impersonate_org")?.value;

    return {
      userId: user.id,
      userName: user.name,
      userRole: "super_admin",
      orgId: impersonatedOrg || null,
      role: "super_admin",
      isImpersonating: !!impersonatedOrg,
      isSuperAdmin: true,
      approved: true,
    };
  }

  // Admin
  if (user.role === "admin") {
    return {
      userId: user.id,
      userName: user.name,
      userRole: "admin",
      orgId: user.id,
      role: "org_admin",
      isImpersonating: false,
      isSuperAdmin: false,
      approved: user.approved,
    };
  }

  // Regular client
  return {
    userId: user.id,
    userName: user.name,
    userRole: "client",
    orgId: user.id,
    role: "org_admin",
    isImpersonating: false,
    isSuperAdmin: false,
    approved: user.approved,
  };
});

/**
 * Get user role — uses cached getOrgContext (no extra DB query).
 */
export async function getUserRole(): Promise<UserRole> {
  const ctx = await getOrgContext();
  return ctx.userRole;
}

export async function requireAdmin() {
  const ctx = await getOrgContext();
  if (ctx.userRole !== "admin" && ctx.userRole !== "super_admin") {
    throw new Error("Unauthorized: admin access required");
  }
}

export async function requireSuperAdmin() {
  const ctx = await getOrgContext();
  if (ctx.userRole !== "super_admin") {
    throw new Error("Unauthorized: super admin access required");
  }
}

/**
 * Require authenticated user — returns DB user ID.
 */
export async function requireAuth(): Promise<string> {
  const session = await verifySession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session.userId;
}

/**
 * Build a Prisma `where` filter scoped to the current org.
 */
export function orgFilter(ctx: OrgContext): { orgId?: string } {
  if (ctx.isSuperAdmin && !ctx.isImpersonating) {
    return {};
  }
  if (!ctx.orgId) {
    return { orgId: "___none___" };
  }
  return { orgId: ctx.orgId };
}
