import { getOrgContext } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

async function getImpersonationLabel(orgId: string): Promise<string> {
  try {
    // Clerk org ID (starts with org_)
    if (orgId.startsWith("org_")) {
      const client = await clerkClient();
      const org = await client.organizations.getOrganization({ organizationId: orgId });
      return org.name;
    }
    // Client user ID (cuid)
    const user = await prisma.user.findUnique({
      where: { id: orgId },
      select: { name: true, email: true },
    });
    return user ? `${user.name} (${user.email})` : orgId;
  } catch {
    return orgId;
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getOrgContext();
  const role = ctx.userRole;

  // Redirect unapproved users to pending page
  if (!ctx.approved) {
    redirect("/pending");
  }

  // Only super_admin sees admin sidebar. admin = client with full permissions.
  const sidebarRole = role === "super_admin" ? "admin" : "client";

  const cookieStore = await cookies();
  const impersonatedOrg = role === "super_admin"
    ? cookieStore.get("impersonate_org")?.value
    : null;

  let impersonationLabel: string | undefined;
  if (impersonatedOrg) {
    impersonationLabel = await getImpersonationLabel(impersonatedOrg);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar
        role={sidebarRole as "admin" | "client"}
        hideOrgSwitcher={role === "admin"}
      />
      <div className="flex flex-1 flex-col overflow-auto">
        {impersonatedOrg && (
          <ImpersonationBanner orgId={impersonatedOrg} orgName={impersonationLabel} />
        )}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
