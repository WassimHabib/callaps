"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, Target, Percent } from "lucide-react";

interface DashboardKpisProps {
  kpis: {
    activeClients: number;
    totalClients: number;
    mrr: number;
    mrrFormatted: string;
    activeProspects: number;
    conversionRate: number;
  };
}

export function DashboardKpis({ kpis }: DashboardKpisProps) {
  const cards = [
    {
      label: "Clients actifs",
      value: `${kpis.activeClients}`,
      sub: `sur ${kpis.totalClients} au total`,
      icon: Users,
      iconBg: "bg-gradient-to-br from-emerald-400 to-emerald-600",
    },
    {
      label: "MRR",
      value: kpis.mrrFormatted,
      sub: null,
      icon: TrendingUp,
      iconBg: "bg-gradient-to-br from-indigo-400 to-indigo-600",
    },
    {
      label: "Prospects en cours",
      value: `${kpis.activeProspects}`,
      sub: null,
      icon: Target,
      iconBg: "bg-gradient-to-br from-violet-400 to-violet-600",
    },
    {
      label: "Taux de conversion",
      value: `${kpis.conversionRate}%`,
      sub: "sur 30 jours",
      icon: Percent,
      iconBg: "bg-gradient-to-br from-amber-400 to-amber-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${card.iconBg}`}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold leading-tight">{card.value}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {card.label}
                </p>
                {card.sub && (
                  <p className="truncate text-xs text-muted-foreground">
                    {card.sub}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
