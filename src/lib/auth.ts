import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { OrgRole } from "@/lib/permissions";
import { cache } from "react";

export type UserRole = "admin" | "client" | "super_admin";
export type EffectiveRole = OrgRole | "super_admin";

export interface OrgContext {
  userId: string;       // DB user ID
  clerkId: string;      // Clerk user ID
  userName: string;     // DB user name
  userRole: UserRole;   // DB user role (admin/client/super_admin)
  orgId: string | null; // Clerk org ID (null for super_admin without impersonation)
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
  const { userId: clerkId, orgId: clerkOrgId, orgRole } = await auth();

  if (!clerkId) {
    throw new Error("Unauthorized");
  }

  let user = await prisma.user.findUnique({ where: { clerkId } });

  // Auto-create user if they exist in Clerk but not in DB
  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser) throw new Error("User not found");

    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const name = `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || "Utilisateur";

    // Use upsert to handle race condition with Clerk webhook
    user = await prisma.user.upsert({
      where: { clerkId },
      create: {
        clerkId,
        email,
        name,
        role: "client",
        approved: false,
      },
      update: {},
    });
  }

  // Super admin
  if (user.role === "super_admin") {
    const cookieStore = await cookies();
    const impersonatedOrg = cookieStore.get("impersonate_org")?.value;

    return {
      userId: user.id,
      clerkId,
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
      clerkId,
      userName: user.name,
      userRole: "admin",
      orgId: clerkOrgId || user.id,
      role: "org_admin",
      isImpersonating: false,
      isSuperAdmin: false,
      approved: user.approved,
    };
  }

  // Regular user — use Clerk org if available, else legacy mode
  const orgId = clerkOrgId || user.id;
  // Clerk roles have "org:" prefix (e.g. "org:org_admin") — strip it
  const rawRole = orgRole ? String(orgRole).replace(/^org:/, "") : null;
  // Only accept known roles, fallback to org_admin for unknown/missing roles
  const VALID_ROLES: string[] = ["org_admin", "manager", "operator", "viewer"];
  const role = (rawRole && VALID_ROLES.includes(rawRole) ? rawRole : "org_admin") as OrgRole;

  return {
    userId: user.id,
    clerkId,
    userName: user.name,
    userRole: "client",
    orgId,
    role,
    isImpersonating: false,
    isSuperAdmin: false,
    approved: user.approved,
  };
});

/**
 * Get user role — uses cached getOrgContext (no extra DB query).
 */
export async function getUserRole(): Promise<UserRole> {
  try {
    const ctx = await getOrgContext();
    return ctx.userRole;
  } catch {
    // Fallback if getOrgContext fails (e.g., user not authenticated)
    const { sessionClaims } = await auth();
    return (sessionClaims?.metadata as { role?: UserRole })?.role || "client";
  }
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

export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
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
