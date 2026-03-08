import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserStats } from "@/lib/stats";
import { Phone, CheckCircle, XCircle, Clock, TrendingUp, PhoneOff } from "lucide-react";

export default async function StatisticsPage() {
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });

  if (!user) {
    return (
      <div>
        <Header title="Statistiques" />
        <div className="flex items-center justify-center p-12">
          <p className="text-muted-foreground">Compte en cours de configuration...</p>
        </div>
      </div>
    );
  }

  const stats = await getUserStats(user.id);

  const cards = [
    {
      title: "Appels totaux",
      value: stats.totalCalls.toLocaleString("fr-FR"),
      icon: Phone,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Complétés",
      value: stats.completedCalls.toLocaleString("fr-FR"),
      icon: CheckCircle,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Échoués",
      value: stats.failedCalls.toLocaleString("fr-FR"),
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      title: "Sans réponse",
      value: stats.noAnswerCalls.toLocaleString("fr-FR"),
      icon: PhoneOff,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "Taux de complétion",
      value: `${stats.completionRate}%`,
      icon: TrendingUp,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      title: "Durée moyenne",
      value: `${Math.floor(stats.avgDuration / 60)}m ${stats.avgDuration % 60}s`,
      icon: Clock,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
    },
  ];

  return (
    <div>
      <Header title="Statistiques" description="Performance de vos campagnes" />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.title}
                className="transition-shadow duration-200 hover:shadow-md"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`rounded-lg p-2 ${card.bg}`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
