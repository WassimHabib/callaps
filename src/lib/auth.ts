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
  orgId: string | null; // Clerk org ID (null for super_admin without impersonation)
  role: EffectiveRole;
  isImpersonating: boolean;
  isSuperAdmin: boolean;
}

export async function getUserRole(): Promise<UserRole> {
  const { sessionClaims, userId: clerkId } = await auth();
  const clerkRole = (sessionClaims?.metadata as { role?: UserRole })?.role;
  if (clerkRole) return clerkRole;

  // Fallback: check DB role (for super_admin set directly in DB)
  if (clerkId) {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { role: true },
    });
    if (user?.role === "super_admin") return "super_admin";
    if (user?.role === "admin") return "admin";
  }

  return "client";
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
 * Cached per request — calling this multiple times in the same render is free.
 */
export const getOrgContext = cache(async (): Promise<OrgContext> => {
  const { userId: clerkId, orgId: clerkOrgId, orgRole } = await auth();

  if (!clerkId) {
    throw new Error("Unauthorized");
  }

  let user = await prisma.user.findUnique({ where: { clerkId } });

  // Auto-create user if they exist in Clerk but not in DB (webhook may not have fired)
  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser) throw new Error("User not found");

    user = await prisma.user.create({
      data: {
        clerkId,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || "Utilisateur",
        role: "client",
      },
    });
  }

  // Check if super_admin
  if (user.role === "super_admin") {
    const cookieStore = await cookies();
    const impersonatedOrg = cookieStore.get("impersonate_org")?.value;

    return {
      userId: user.id,
      clerkId,
      userName: user.name,
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
    userName: user.name,
    orgId,
    role,
    isImpersonating: false,
    isSuperAdmin: false,
  };
});

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
