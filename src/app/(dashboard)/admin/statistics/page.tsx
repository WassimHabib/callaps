import { requireSuperAdmin } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import {
  getOrgStats,
  getOrgCallsPerDay,
  getOrgSentimentDistribution,
  getOrgCallsByHour,
  getOrgDurationDistribution,
  getTopCampaigns,
} from "@/lib/stats";
import {
  Phone,
  CheckCircle,
  Clock,
  SmilePlus,
  ArrowUpRight,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CallsChart } from "@/components/analytics/calls-chart";
import { SentimentChart } from "@/components/analytics/sentiment-chart";
import { HoursChart } from "@/components/analytics/hours-chart";
import { DurationChart } from "@/components/analytics/duration-chart";
import { TopCampaigns } from "@/components/analytics/top-campaigns";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function getDominantSentiment(data: {
  positive: number;
  neutral: number;
  negative: number;
}): string {
  const total = data.positive + data.neutral + data.negative;
  if (total === 0) return "N/A";
  if (data.positive >= data.neutral && data.positive >= data.negative)
    return "Positif";
  if (data.negative >= data.neutral && data.negative >= data.positive)
    return "Negatif";
  return "Neutre";
}

export default async function AdminStatisticsPage() {
  await requireSuperAdmin();

  // Empty filter = all data (no org/user scoping)
  const globalFilter = {};

  const [
    stats,
    callsPerDay,
    sentiment,
    hours,
    durations,
    topCampaignsData,
    clientCount,
    agentCount,
  ] = await Promise.all([
    getOrgStats(globalFilter),
    getOrgCallsPerDay(globalFilter, 30),
    getOrgSentimentDistribution(globalFilter),
    getOrgCallsByHour(globalFilter),
    getOrgDurationDistribution(globalFilter),
    getTopCampaigns(globalFilter, 10),
    prisma.user.count({ where: { role: "client" } }),
    prisma.agent.count(),
  ]);

  const kpis = [
    {
      title: "Total appels",
      value: stats.totalCalls.toLocaleString("fr-FR"),
      icon: Phone,
      gradient: "from-blue-500 to-cyan-400",
      shadow: "shadow-blue-500/20",
    },
    {
      title: "Taux de réussite",
      value: `${stats.completionRate}%`,
      icon: CheckCircle,
      gradient: "from-emerald-500 to-teal-400",
      shadow: "shadow-emerald-500/20",
    },
    {
      title: "Durée moyenne",
      value: formatDuration(stats.avgDuration),
      icon: Clock,
      gradient: "from-indigo-500 to-violet-400",
      shadow: "shadow-indigo-500/20",
    },
    {
      title: "Sentiment dominant",
      value: getDominantSentiment(sentiment),
      icon: SmilePlus,
      gradient: "from-amber-500 to-orange-400",
      shadow: "shadow-amber-500/20",
    },
    {
      title: "Clients actifs",
      value: clientCount.toString(),
      icon: Users,
      gradient: "from-rose-500 to-pink-400",
      shadow: "shadow-rose-500/20",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header
        title="Statistiques globales"
        description="Performance de toute la plateforme"
      />
      <div className="space-y-6 p-8">
        {/* KPI Row */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card
                key={kpi.title}
                className="group border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[13px] font-medium text-slate-500">
                        {kpi.title}
                      </p>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                        {kpi.value}
                      </p>
                    </div>
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${kpi.gradient} shadow-lg ${kpi.shadow}`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-[12px] text-slate-400">
                    <ArrowUpRight className="h-3 w-3" />
                    Toute la plateforme
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CallsChart data={callsPerDay} />
          </div>
          <div>
            <SentimentChart data={sentiment} />
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-5 md:grid-cols-2">
          <HoursChart data={hours} />
          <DurationChart data={durations} />
        </div>

        {/* Top campaigns */}
        <TopCampaigns data={topCampaignsData} />
      </div>
    </div>
  );
}
