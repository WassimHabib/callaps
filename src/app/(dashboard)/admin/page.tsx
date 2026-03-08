import { requireAdmin } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Bot, Megaphone, Phone } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  await requireAdmin();

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
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Agents IA",
      value: agentCount,
      icon: Bot,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      title: "Campagnes",
      value: campaignCount,
      icon: Megaphone,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "Appels totaux",
      value: callCount,
      icon: Phone,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
  ];

  return (
    <div>
      <Header title="Administration" description="Vue d'ensemble de la plateforme" />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className="transition-shadow duration-200 hover:shadow-md"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`rounded-lg p-2 ${stat.bg}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
