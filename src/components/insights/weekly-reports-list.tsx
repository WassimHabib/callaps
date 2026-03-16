"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Settings,
  FileText,
  Calendar,
  Sparkles,
  Loader2,
} from "lucide-react";
import { triggerWeeklyReport } from "@/app/(dashboard)/insights/actions";

interface Report {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  totalCalls: number;
  totalDemands: number;
  topCategories: unknown;
  kpis: unknown;
  recommendations: unknown;
  profession: string | null;
  createdAt: Date;
}

type TopCategory = { category: string; label: string; count: number; percentage: number };
type Recommendation = { title: string; description: string; priority: string; type: string };

const typeIcons: Record<string, typeof Lightbulb> = {
  optimization: Settings,
  opportunity: TrendingUp,
  alert: AlertTriangle,
};

const priorityColors: Record<string, string> = {
  high: "border-l-red-500 bg-red-50/50",
  medium: "border-l-amber-500 bg-amber-50/50",
  low: "border-l-blue-500 bg-blue-50/50",
};

function formatPeriod(start: Date, end: Date) {
  const s = new Date(start).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const e = new Date(end).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  return `${s} — ${e}`;
}

export function WeeklyReportsList({ reports }: { reports: Report[] }) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<{ message: string; success: boolean } | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setToast(null);
    try {
      const result = await triggerWeeklyReport();
      setToast({ message: result.message, success: result.success });
      if (result.success) {
        router.refresh();
      }
    } catch {
      setToast({ message: "Erreur inattendue lors de la génération.", success: false });
    } finally {
      setGenerating(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const generateButton = (
    <Button
      onClick={handleGenerate}
      disabled={generating}
      className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md hover:from-indigo-600 hover:to-violet-600"
    >
      {generating ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="mr-2 h-4 w-4" />
      )}
      {generating ? "Génération en cours..." : "Générer le bilan"}
    </Button>
  );

  if (reports.length === 0) {
    return (
      <>
        {toast && (
          <div
            className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
              toast.success
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {toast.message}
          </div>
        )}
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="py-16 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">
              Aucun bilan hebdomadaire généré pour le moment.
            </p>
            <p className="mb-4 mt-1 text-xs text-slate-400">
              Cliquez ci-dessous pour générer le bilan de la semaine dernière.
            </p>
            {generateButton}
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            toast.success
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex justify-end">
        {generateButton}
      </div>

      {reports.map((report) => {
        const recs = (Array.isArray(report.recommendations) ? report.recommendations : []) as Recommendation[];
        const topCats = (Array.isArray(report.topCategories) ? report.topCategories : []) as TopCategory[];

        return (
          <Card key={report.id} className="border-0 bg-white shadow-sm">
            <CardContent className="p-6">
              {/* Header */}
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    <h3 className="text-[15px] font-semibold text-slate-900">
                      Bilan — {formatPeriod(report.periodStart, report.periodEnd)}
                    </h3>
                  </div>
                  {report.profession && (
                    <p className="mt-1 text-xs text-slate-400">
                      Métier : {report.profession}
                    </p>
                  )}
                </div>
                <div className="flex gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-slate-900">{report.totalCalls}</p>
                    <p className="text-[10px] text-slate-400">Appels</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-indigo-600">{report.totalDemands}</p>
                    <p className="text-[10px] text-slate-400">Demandes</p>
                  </div>
                </div>
              </div>

              {/* Top Categories */}
              {topCats.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Top catégories
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {topCats.slice(0, 5).map((cat) => (
                      <span
                        key={cat.category}
                        className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                      >
                        {cat.label} ({cat.percentage}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {recs.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Recommandations IA
                  </p>
                  <div className="space-y-2">
                    {recs.map((rec, i) => {
                      const Icon = typeIcons[rec.type] ?? Lightbulb;
                      const color = priorityColors[rec.priority] ?? priorityColors.medium;
                      return (
                        <div
                          key={i}
                          className={`rounded-lg border-l-4 p-3 ${color}`}
                        >
                          <div className="flex items-start gap-2">
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                            <div>
                              <p className="text-sm font-medium text-slate-800">
                                {rec.title}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-600">
                                {rec.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
