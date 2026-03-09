import { getUserRole } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getUserRole();
  const sidebarRole = role === "super_admin" ? "admin" : role;

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar role={sidebarRole as "admin" | "client"} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
