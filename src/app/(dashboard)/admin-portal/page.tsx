import Link from "next/link";
import { Header } from "@/components/layout/header";
import { DashboardKpis } from "@/components/admin-portal/dashboard-kpis";
import { DashboardWidgets } from "@/components/admin-portal/dashboard-widgets";
import { getDashboardStats } from "./actions";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function AdminPortalDashboardPage() {
  const stats = await getDashboardStats();
  return (
    <>
      <Header
        title="Portail Admin"
        description="Vue d'ensemble de votre activité"
      />
      <div className="space-y-6 p-8">
        <div className="flex gap-3">
          <Link href="/admin-portal/clients/new">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="mr-1 h-4 w-4" />
              Nouveau client
            </Button>
          </Link>
          <Link href="/admin-portal/prospects/new">
            <Button size="sm" variant="outline">
              <Plus className="mr-1 h-4 w-4" />
              Nouveau prospect
            </Button>
          </Link>
        </div>
        <DashboardKpis kpis={stats.kpis} />
        <DashboardWidgets
          alerts={stats.alerts}
          nextActions={stats.nextActions}
          recentClients={stats.recentClients}
        />
      </div>
    </>
  );
}
