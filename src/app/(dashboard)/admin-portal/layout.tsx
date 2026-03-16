import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/auth";
import { AdminPortalSidebar } from "@/components/admin-portal/admin-portal-sidebar";

export default async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let ctx;
  try {
    ctx = await getOrgContext();
  } catch {
    redirect("/pending");
  }

  if (ctx.userRole !== "admin" && ctx.userRole !== "super_admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminPortalSidebar userName={ctx.userName} />
      <div className="flex flex-1 flex-col overflow-auto">
        <main className="min-h-screen bg-slate-50/50">{children}</main>
      </div>
    </div>
  );
}
