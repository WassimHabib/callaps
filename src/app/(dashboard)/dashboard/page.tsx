import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, PhoneCall, CheckCircle, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });

  if (!user) {
    return (
      <div>
        <Header title="Dashboard" />
        <div className="flex items-center justify-center p-12">
          <p className="text-muted-foreground">
            Votre compte est en cours de configuration...
          </p>
        </div>
      </div>
    );
  }

  const [totalCalls, activeCalls, completedCalls, campaigns] =
    await Promise.all([
      prisma.call.count({
        where: { campaign: { userId: user.id } },
      }),
      prisma.call.count({
        where: {
          campaign: { userId: user.id },
          status: "in_progress",
        },
      }),
      prisma.call.count({
        where: {
          campaign: { userId: user.id },
          status: "completed",
        },
      }),
      prisma.campaign.count({
        where: { userId: user.id },
      }),
    ]);

  const conversionRate =
    totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;

  const stats = [
    {
      title: "Appels totaux",
      value: totalCalls.toLocaleString("fr-FR"),
      icon: Phone,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "En cours",
      value: activeCalls.toLocaleString("fr-FR"),
      icon: PhoneCall,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "Completés",
      value: completedCalls.toLocaleString("fr-FR"),
      icon: CheckCircle,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Taux de complétion",
      value: `${conversionRate}%`,
      icon: TrendingUp,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
  ];

  return (
    <div>
      <Header
        title={`Bonjour, ${user.name.split(" ")[0]}`}
        description={`${campaigns} campagne${campaigns > 1 ? "s" : ""} actives`}
      />
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
