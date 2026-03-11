"use client";

import { useState, useTransition, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Phone,
  Clock,
  CheckCircle,
  SmilePlus,
  ArrowUpRight,
  Loader2,
  PhoneOff,
  Calendar,
  X,
} from "lucide-react";
import {
  fetchCalls,
  type FetchCallsResult,
  type CallListItem,
} from "@/app/(dashboard)/calls/actions";
import { CallDetailDialog } from "./call-detail-dialog";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: string) {
  switch (status) {
    case "completed":
      return (
        <Badge className="border-0 bg-emerald-50 text-emerald-700 text-[11px]">
          Terminé
        </Badge>
      );
    case "failed":
      return (
        <Badge className="border-0 bg-red-50 text-red-700 text-[11px]">
          Échoué
        </Badge>
      );
    case "no_answer":
      return (
        <Badge className="border-0 bg-slate-100 text-slate-600 text-[11px]">
          Sans réponse
        </Badge>
      );
    case "in_progress":
      return (
        <Badge className="border-0 bg-blue-50 text-blue-700 text-[11px]">
          En cours
        </Badge>
      );
    case "pending":
      return (
        <Badge className="border-0 bg-amber-50 text-amber-700 text-[11px]">
          En attente
        </Badge>
      );
    default:
      return (
        <Badge className="border-0 bg-slate-100 text-slate-600 text-[11px]">
          {status}
        </Badge>
      );
  }
}

function sentimentDisplay(sentiment: string | null) {
  if (!sentiment) return <span className="text-slate-300">—</span>;
  const s = sentiment.toLowerCase();
  if (s.includes("positive") || s.includes("positif") || s === "positive") {
    return (
      <span className="flex items-center gap-1 text-emerald-600 text-sm">
        <span>{"\ud83d\ude0a"}</span> Positif
      </span>
    );
  }
  if (s.includes("negative") || s.includes("négatif") || s.includes("negatif") || s === "negative") {
    return (
      <span className="flex items-center gap-1 text-red-600 text-sm">
        <span>{"\ud83d\ude1e"}</span> Négatif
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-slate-500 text-sm">
      <span>{"\ud83d\ude10"}</span> Neutre
    </span>
  );
}

function truncate(text: string | null, max: number): string {
  if (!text) return "—";
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CallsClientProps {
  initialData: FetchCallsResult;
  campaigns: { id: string; name: string }[];
}

const STATUS_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "completed", label: "Terminé" },
  { value: "failed", label: "Échoué" },
  { value: "no_answer", label: "Sans réponse" },
  { value: "in_progress", label: "En cours" },
  { value: "pending", label: "En attente" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function CallsClient({ initialData, campaigns }: CallsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [calls, setCalls] = useState<CallListItem[]>(initialData.calls);
  const [total, setTotal] = useState(initialData.total);
  const [hasMore, setHasMore] = useState(initialData.hasMore);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [campaignId, setCampaignId] = useState("");

  // Detail panel
  const [selectedCall, setSelectedCall] = useState<CallListItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Debounced search
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Computed stats
  const stats = useMemo(() => {
    const totalCalls = total;
    const completedCalls = calls.filter((c) => c.status === "completed");
    const avgDuration =
      completedCalls.length > 0
        ? Math.round(
            completedCalls.reduce((sum, c) => sum + (c.duration || 0), 0) /
              completedCalls.length
          )
        : 0;
    const successRate =
      total > 0
        ? Math.round(
            (calls.filter((c) => c.status === "completed").length /
              calls.length) *
              100
          )
        : 0;
    const positiveSentiment =
      calls.length > 0
        ? Math.round(
            (calls.filter((c) => {
              const s = (c.sentiment || "").toLowerCase();
              return s.includes("positive") || s.includes("positif");
            }).length /
              calls.filter((c) => c.sentiment).length) *
              100
          ) || 0
        : 0;

    return { totalCalls, avgDuration, successRate, positiveSentiment };
  }, [calls, total]);

  // Fetch with current filters
  const doFetch = useCallback(
    (opts?: { append?: boolean; overrideSearch?: string }) => {
      const offset = opts?.append ? calls.length : 0;
      const searchVal =
        opts?.overrideSearch !== undefined ? opts.overrideSearch : search;

      startTransition(async () => {
        try {
          const result = await fetchCalls({
            search: searchVal || undefined,
            status: status || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            campaignId: campaignId || undefined,
            limit: 25,
            offset,
          });
          if (opts?.append) {
            setCalls((prev) => [...prev, ...result.calls]);
          } else {
            setCalls(result.calls);
          }
          setTotal(result.total);
          setHasMore(result.hasMore);
        } catch (err) {
          console.error("Erreur chargement appels:", err);
        }
      });
    },
    [calls.length, search, status, dateFrom, dateTo, campaignId]
  );

  // Search handler with debounce
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      if (searchTimer) clearTimeout(searchTimer);
      const timer = setTimeout(() => {
        doFetch({ overrideSearch: value });
      }, 400);
      setSearchTimer(timer);
    },
    [doFetch, searchTimer]
  );

  // Filter handlers
  const handleStatusChange = useCallback(
    (value: string) => {
      setStatus(value);
      setTimeout(() => doFetch(), 0);
    },
    [doFetch]
  );

  const handleCampaignChange = useCallback(
    (value: string) => {
      setCampaignId(value);
      setTimeout(() => doFetch(), 0);
    },
    [doFetch]
  );

  const handleDateFromChange = useCallback(
    (value: string) => {
      setDateFrom(value);
      setTimeout(() => doFetch(), 0);
    },
    [doFetch]
  );

  const handleDateToChange = useCallback(
    (value: string) => {
      setDateTo(value);
      setTimeout(() => doFetch(), 0);
    },
    [doFetch]
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    setCampaignId("");
    startTransition(async () => {
      try {
        const result = await fetchCalls({ limit: 25, offset: 0 });
        setCalls(result.calls);
        setTotal(result.total);
        setHasMore(result.hasMore);
      } catch (err) {
        console.error("Erreur chargement appels:", err);
      }
    });
  }, []);

  const hasActiveFilters = search || status || dateFrom || dateTo || campaignId;

  const handleCallUpdated = useCallback((updated: CallListItem) => {
    setCalls((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    setSelectedCall(updated);
  }, []);

  const kpis = [
    {
      title: "Total appels",
      value: stats.totalCalls.toLocaleString("fr-FR"),
      icon: Phone,
      gradient: "from-blue-500 to-cyan-400",
      shadow: "shadow-blue-500/20",
    },
    {
      title: "Durée moyenne",
      value: formatDuration(stats.avgDuration),
      icon: Clock,
      gradient: "from-indigo-500 to-violet-400",
      shadow: "shadow-indigo-500/20",
    },
    {
      title: "Taux de réussite",
      value: `${stats.successRate}%`,
      icon: CheckCircle,
      gradient: "from-emerald-500 to-teal-400",
      shadow: "shadow-emerald-500/20",
    },
    {
      title: "Sentiment positif",
      value: `${stats.positiveSentiment}%`,
      icon: SmilePlus,
      gradient: "from-amber-500 to-orange-400",
      shadow: "shadow-amber-500/20",
    },
  ];

  return (
    <>
      {/* Stats Row */}
      <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.title}
              className="group border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-slate-500">
                      {kpi.title}
                    </p>
                    <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
                      {kpi.value}
                    </p>
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${kpi.gradient} shadow-lg ${kpi.shadow}`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] text-slate-400">
                  <ArrowUpRight className="h-3 w-3" />
                  Sur la période affichée
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="mb-5 flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Rechercher par contact ou téléphone..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-72 pl-9"
          />
        </div>

        {/* Status */}
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm text-slate-700 outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Campaign */}
        {campaigns.length > 0 && (
          <select
            value={campaignId}
            onChange={(e) => handleCampaignChange(e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm text-slate-700 outline-none"
          >
            <option value="">Toutes les campagnes</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        {/* Date From */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateFromChange(e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm text-slate-700 outline-none"
            placeholder="Du"
          />
          <span className="text-xs text-slate-400">au</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleDateToChange(e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm text-slate-700 outline-none"
            placeholder="Au"
          />
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs text-slate-500"
          >
            <X className="mr-1 h-3 w-3" />
            Effacer les filtres
          </Button>
        )}

        {/* Count */}
        <p className="ml-auto text-sm text-slate-500">
          {total} appel{total > 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      {calls.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25">
            <PhoneOff className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            Aucun appel trouvé
          </h3>
          <p className="mb-6 mt-1 max-w-sm text-center text-sm text-slate-500">
            {hasActiveFilters
              ? "Aucun appel ne correspond à vos critères de recherche. Essayez de modifier vos filtres."
              : "Les appels apparaîtront ici une fois que vous aurez lancé votre première campagne ou effectué un appel."}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>
              Effacer les filtres
            </Button>
          )}
        </div>
      ) : (
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="text-xs font-medium text-slate-500">
                    Date / Heure
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">
                    Contact
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">
                    Durée
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">
                    Statut
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">
                    Sentiment
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">
                    Campagne
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">
                    Résumé
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <TableRow
                    key={call.id}
                    className="cursor-pointer border-slate-50 transition-colors hover:bg-slate-50/80"
                    onClick={() => {
                      setSelectedCall(call);
                      setDetailOpen(true);
                    }}
                  >
                    <TableCell className="text-sm text-slate-600">
                      {formatDateTime(call.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-xs font-bold text-indigo-600">
                          {call.contact
                            ? call.contact.name
                                .split(" ")
                                .map((w) => w[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()
                            : "?"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {call.contact?.name || "Inconnu"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {call.contact?.phone || "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 font-mono">
                      {formatDuration(call.duration)}
                    </TableCell>
                    <TableCell>{statusBadge(call.status)}</TableCell>
                    <TableCell>{sentimentDisplay(call.sentiment)}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {call.campaign?.name || (
                        <span className="text-slate-400">Appel direct</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] text-sm text-slate-500">
                      {truncate(call.summary, 80)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCall(call);
                          setDetailOpen(true);
                        }}
                      >
                        Détails
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => doFetch({ append: true })}
            disabled={isPending}
            className="px-8"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Chargement...
              </>
            ) : (
              "Voir plus d'appels"
            )}
          </Button>
        </div>
      )}

      {/* Loading overlay for filter changes */}
      {isPending && calls.length > 0 && (
        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Mise à jour...
          </div>
        </div>
      )}

      {/* Call Detail Panel */}
      <CallDetailDialog
        call={selectedCall}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onCallUpdated={handleCallUpdated}
      />
    </>
  );
}
