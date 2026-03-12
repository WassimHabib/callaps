"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowDown, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

interface Demand {
  id: string;
  category: string;
  label: string;
  details: string | null;
  urgency: string;
  date: Date;
  contactName: string;
  contactPhone: string;
}

interface Props {
  demands: Demand[];
  total: number;
  pages: number;
  currentPage: number;
  period: string;
}

const urgencyConfig = {
  high: { label: "Urgent", icon: AlertTriangle, color: "text-red-600 bg-red-50" },
  medium: { label: "Normal", icon: ArrowRight, color: "text-amber-600 bg-amber-50" },
  low: { label: "Faible", icon: ArrowDown, color: "text-slate-500 bg-slate-50" },
};

export function DemandsTable({ demands, total, pages, currentPage, period }: Props) {
  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-[15px] font-semibold text-slate-900">
          Détail des demandes ({total})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {demands.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Aucune demande sur cette période
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="pb-3 font-medium text-slate-500">Date</th>
                    <th className="pb-3 font-medium text-slate-500">Contact</th>
                    <th className="pb-3 font-medium text-slate-500">Catégorie</th>
                    <th className="pb-3 font-medium text-slate-500">Urgence</th>
                    <th className="pb-3 font-medium text-slate-500">Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {demands.map((d) => {
                    const urgency = urgencyConfig[d.urgency as keyof typeof urgencyConfig] ?? urgencyConfig.medium;
                    const Icon = urgency.icon;
                    return (
                      <tr key={d.id} className="border-b border-slate-50">
                        <td className="py-3 text-slate-600">
                          {new Date(d.date).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3">
                          <p className="font-medium text-slate-800">{d.contactName}</p>
                          <p className="text-xs text-slate-400">{d.contactPhone}</p>
                        </td>
                        <td className="py-3">
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                            {d.label}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${urgency.color}`}>
                            <Icon className="h-3 w-3" />
                            {urgency.label}
                          </span>
                        </td>
                        <td className="max-w-[250px] truncate py-3 text-slate-500">
                          {d.details ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <a
                  href={currentPage > 1 ? `/insights?tab=demands&period=${period}&page=${currentPage - 1}` : "#"}
                  className={`rounded-lg p-2 ${currentPage > 1 ? "hover:bg-slate-100" : "pointer-events-none opacity-30"}`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </a>
                <span className="text-sm text-slate-500">
                  Page {currentPage} / {pages}
                </span>
                <a
                  href={currentPage < pages ? `/insights?tab=demands&period=${period}&page=${currentPage + 1}` : "#"}
                  className={`rounded-lg p-2 ${currentPage < pages ? "hover:bg-slate-100" : "pointer-events-none opacity-30"}`}
                >
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
