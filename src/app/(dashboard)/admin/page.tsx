import { requireSuperAdmin } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Bot, Megaphone, Phone, ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  await requireSuperAdmin();

  const [userCount, agentCount, campaignCount, callCount] = await Promise.all([
    prisma.user.count({ where: { role: "client" } }),
    prisma.agent.count(),
    prisma.campaign.count(),
    prisma.call.count(),
  ]);

  const stats = [
    {
      title: "Clients",
      value: userCount,
      icon: Users,
      gradient: "from-blue-500 to-cyan-400",
      shadow: "shadow-blue-500/20",
    },
    {
      title: "Agents IA",
      value: agentCount,
      icon: Bot,
      gradient: "from-indigo-500 to-violet-400",
      shadow: "shadow-indigo-500/20",
    },
    {
      title: "Campagnes",
      value: campaignCount,
      icon: Megaphone,
      gradient: "from-amber-500 to-orange-400",
      shadow: "shadow-amber-500/20",
    },
    {
      title: "Appels totaux",
      value: callCount,
      icon: Phone,
      gradient: "from-emerald-500 to-teal-400",
      shadow: "shadow-emerald-500/20",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header title="Administration" description="Vue d'ensemble de la plateforme" />
      <div className="space-y-8 p-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className="group border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[13px] font-medium text-slate-500">
                        {stat.title}
                      </p>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                        {stat.value}
                      </p>
                    </div>
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg ${stat.shadow}`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-[12px] text-slate-400">
                    <ArrowUpRight className="h-3 w-3" />
                    Mis à jour en temps réel
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
