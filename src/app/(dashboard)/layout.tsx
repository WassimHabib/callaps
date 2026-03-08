import { getUserRole } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getUserRole();

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar role={role} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
