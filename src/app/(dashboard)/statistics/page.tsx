import { getOrgContext, orgFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { getOrgStats } from "@/lib/stats";
import {
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  PhoneOff,
  ArrowUpRight,
} from "lucide-react";

export default async function StatisticsPage() {
  const ctx = await getOrgContext();

  const stats = await getOrgStats(orgFilter(ctx));

  const cards = [
    {
      title: "Appels totaux",
      value: stats.totalCalls.toLocaleString("fr-FR"),
      icon: Phone,
      gradient: "from-blue-500 to-cyan-400",
      shadow: "shadow-blue-500/20",
    },
    {
      title: "Complétés",
      value: stats.completedCalls.toLocaleString("fr-FR"),
      icon: CheckCircle,
      gradient: "from-emerald-500 to-teal-400",
      shadow: "shadow-emerald-500/20",
    },
    {
      title: "Échoués",
      value: stats.failedCalls.toLocaleString("fr-FR"),
      icon: XCircle,
      gradient: "from-red-500 to-rose-400",
      shadow: "shadow-red-500/20",
    },
    {
      title: "Sans réponse",
      value: stats.noAnswerCalls.toLocaleString("fr-FR"),
      icon: PhoneOff,
      gradient: "from-amber-500 to-orange-400",
      shadow: "shadow-amber-500/20",
    },
    {
      title: "Taux de complétion",
      value: `${stats.completionRate}%`,
      icon: TrendingUp,
      gradient: "from-indigo-500 to-violet-400",
      shadow: "shadow-indigo-500/20",
    },
    {
      title: "Durée moyenne",
      value: `${Math.floor(stats.avgDuration / 60)}m ${stats.avgDuration % 60}s`,
      icon: Clock,
      gradient: "from-cyan-500 to-blue-400",
      shadow: "shadow-cyan-500/20",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header title="Statistiques" description="Performance de vos campagnes" />
      <div className="space-y-8 p-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.title}
                className="group border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[13px] font-medium text-slate-500">
                        {card.title}
                      </p>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                        {card.value}
                      </p>
                    </div>
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg ${card.shadow}`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-[12px] text-slate-400">
                    <ArrowUpRight className="h-3 w-3" />
                    Derniers 30 jours
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
