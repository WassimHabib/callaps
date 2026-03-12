import { getOrgContext, orgFilter } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import {
  getDemandsByCategory,
  getDemandEvolution,
  getDemandsList,
  getDemandsPerDay,
  getWeeklyReports,
} from "@/lib/insights-stats";
import {
  MessageSquareText,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Lightbulb,
} from "lucide-react";
import { DemandCategoriesChart } from "@/components/insights/demand-categories-chart";
import { DemandTrendChart } from "@/components/insights/demand-trend-chart";
import { DemandsTable } from "@/components/insights/demands-table";
import { WeeklyReportsList } from "@/components/insights/weekly-reports-list";

interface InsightsPageProps {
  searchParams: Promise<{ period?: string; tab?: string; page?: string }>;
}

function getPeriodDates(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  switch (period) {
    case "30d":
      start.setDate(start.getDate() - 30);
      break;
    case "90d":
      start.setDate(start.getDate() - 90);
      break;
    case "7d":
    default:
      start.setDate(start.getDate() - 7);
      break;
  }
  return { start, end };
}

export default async function InsightsPage({ searchParams }: InsightsPageProps) {
  const params = await searchParams;
  const period = params.period ?? "7d";
  const tab = params.tab ?? "demands";
  const page = parseInt(params.page ?? "1", 10);

  const ctx = await getOrgContext();
  const filter = orgFilter(ctx);
  const { start, end } = getPeriodDates(period);
  const periodFilter = { orgId: filter.orgId, start, end };

  const [categories, evolution, trend, demandsList, reports] =
    await Promise.all([
      getDemandsByCategory(periodFilter),
      getDemandEvolution(periodFilter),
      getDemandsPerDay(periodFilter),
      getDemandsList({ ...periodFilter, page }),
      getWeeklyReports(filter),
    ]);

  const topCategory = categories[0];

  const kpis = [
    {
      title: "Total demandes",
      value: evolution.current.toLocaleString("fr-FR"),
      icon: MessageSquareText,
      gradient: "from-blue-500 to-cyan-400",
      shadow: "shadow-blue-500/20",
      sub: `sur ${period === "7d" ? "7 jours" : period === "30d" ? "30 jours" : "90 jours"}`,
    },
    {
      title: "Catégorie #1",
      value: topCategory?.label ?? "N/A",
      icon: BarChart3,
      gradient: "from-violet-500 to-purple-400",
      shadow: "shadow-violet-500/20",
      sub: topCategory ? `${topCategory.percentage}% des demandes` : "",
    },
    {
      title: "Évolution",
      value:
        evolution.evolution !== null
          ? `${evolution.evolution > 0 ? "+" : ""}${evolution.evolution}%`
          : "N/A",
      icon: evolution.evolution && evolution.evolution > 0 ? TrendingUp : TrendingDown,
      gradient:
        evolution.evolution && evolution.evolution > 0
          ? "from-emerald-500 to-teal-400"
          : "from-red-500 to-orange-400",
      shadow:
        evolution.evolution && evolution.evolution > 0
          ? "shadow-emerald-500/20"
          : "shadow-red-500/20",
      sub: "vs période précédente",
    },
  ];

  const periods = [
    { value: "7d", label: "7 jours" },
    { value: "30d", label: "30 jours" },
    { value: "90d", label: "90 jours" },
  ];

  const tabs = [
    { value: "demands", label: "Analyse des demandes", icon: BarChart3 },
    { value: "reports", label: "Bilans & Recommandations", icon: Lightbulb },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header
        title="Insights"
        description="Analyse des demandes et recommandations IA"
      />
      <div className="space-y-6 p-8">
        {/* Tab Selector */}
        <div className="flex items-center gap-4">
          <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <a
                  key={t.value}
                  href={`/insights?tab=${t.value}&period=${period}`}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-all ${
                    tab === t.value
                      ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </a>
              );
            })}
          </div>

          {tab === "demands" && (
            <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm">
              {periods.map((p) => (
                <a
                  key={p.value}
                  href={`/insights?tab=${tab}&period=${p.value}`}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${
                    period === p.value
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {p.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {tab === "demands" ? (
          <>
            {/* KPI Row */}
            <div className="grid gap-5 sm:grid-cols-3">
              {kpis.map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <Card
                    key={kpi.title}
                    className="border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[13px] font-medium text-slate-500">
                            {kpi.title}
                          </p>
                          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                            {kpi.value}
                          </p>
                        </div>
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${kpi.gradient} shadow-lg ${kpi.shadow}`}
                        >
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <p className="mt-3 text-[12px] text-slate-400">
                        {kpi.sub}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Charts Row */}
            <div className="grid gap-5 lg:grid-cols-2">
              <DemandCategoriesChart data={categories} />
              <DemandTrendChart
                data={trend.data}
                categories={trend.categories}
              />
            </div>

            {/* Detail Table */}
            <DemandsTable
              demands={demandsList.demands}
              total={demandsList.total}
              pages={demandsList.pages}
              currentPage={page}
              period={period}
            />
          </>
        ) : (
          <WeeklyReportsList reports={reports} />
        )}
      </div>
    </div>
  );
}
