import { getUserRole } from "@/lib/auth";
import { cookies } from "next/headers";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getUserRole();
  const sidebarRole = role === "super_admin" ? "admin" : role;

  const cookieStore = await cookies();
  const impersonatedOrg = role === "super_admin"
    ? cookieStore.get("impersonate_org")?.value
    : null;

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar role={sidebarRole as "admin" | "client"} />
      <div className="flex flex-1 flex-col overflow-auto">
        {impersonatedOrg && <ImpersonationBanner orgId={impersonatedOrg} />}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
