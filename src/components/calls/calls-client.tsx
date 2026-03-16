"use client";

import { useState, useTransition, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  PhoneIncoming,
  PhoneOutgoing,
  Smile,
  Meh,
  Frown,
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
  return `${m}m${s.toString().padStart(2, "0")}s`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Extract caller display info from call data */
function getCallerInfo(call: CallListItem): { name: string; phone: string; initials: string } {
  const meta = (call.metadata as Record<string, unknown>) || {};

  if (call.contact) {
    return {
      name: call.contact.name,
      phone: call.contact.phone,
      initials: call.contact.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    };
  }

  // Standalone calls — use metadata
  const direction = meta.direction as string | undefined;
  const toNumber = (meta.toNumber as string) || "";
  const fromNumber = (meta.fromNumber as string) || "";
  const phone = direction === "outbound" ? toNumber : fromNumber || toNumber;

  return {
    name: phone || "Numéro inconnu",
    phone: phone,
    initials: phone ? phone.slice(-2) : "?",
  };
}

function getDirection(call: CallListItem): "inbound" | "outbound" {
  const meta = (call.metadata as Record<string, unknown>) || {};
  return (meta.direction as string) === "outbound" ? "outbound" : "inbound";
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  completed: { label: "Terminé", className: "bg-emerald-50 text-emerald-600" },
  failed: { label: "Échoué", className: "bg-red-50 text-red-600" },
  no_answer: { label: "Sans réponse", className: "bg-slate-100 text-slate-500" },
  in_progress: { label: "En cours", className: "bg-blue-50 text-blue-600" },
  pending: { label: "En attente", className: "bg-amber-50 text-amber-600" },
};

const SENTIMENT_CONFIG: Record<string, { icon: typeof Smile; className: string }> = {
  positif: { icon: Smile, className: "text-emerald-500" },
  positive: { icon: Smile, className: "text-emerald-500" },
  neutre: { icon: Meh, className: "text-amber-400" },
  neutral: { icon: Meh, className: "text-amber-400" },
  négatif: { icon: Frown, className: "text-red-400" },
  negatif: { icon: Frown, className: "text-red-400" },
  negative: { icon: Frown, className: "text-red-400" },
};

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
interface CallsClientProps {
  initialData: FetchCallsResult;
  campaigns: { id: string; name: string }[];
}

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

  // Debounce
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Stats
  const stats = useMemo(() => {
    const completedCalls = calls.filter((c) => c.status === "completed");
    const avgDuration =
      completedCalls.length > 0
        ? Math.round(completedCalls.reduce((sum, c) => sum + (c.duration || 0), 0) / completedCalls.length)
        : 0;
    const successRate = calls.length > 0
      ? Math.round((completedCalls.length / calls.length) * 100)
      : 0;
    const withSentiment = calls.filter((c) => c.sentiment);
    const positiveSentiment = withSentiment.length > 0
      ? Math.round(
          (withSentiment.filter((c) => {
            const s = (c.sentiment || "").toLowerCase();
            return s.includes("positive") || s.includes("positif");
          }).length / withSentiment.length) * 100
        )
      : 0;
    return { totalCalls: total, avgDuration, successRate, positiveSentiment };
  }, [calls, total]);

  const doFetch = useCallback(
    (opts?: { append?: boolean; overrideSearch?: string }) => {
      const offset = opts?.append ? calls.length : 0;
      const searchVal = opts?.overrideSearch !== undefined ? opts.overrideSearch : search;

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

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      if (searchTimer) clearTimeout(searchTimer);
      const timer = setTimeout(() => doFetch({ overrideSearch: value }), 400);
      setSearchTimer(timer);
    },
    [doFetch, searchTimer]
  );

  const handleFilterChange = useCallback(
    (setter: (v: string) => void) => (value: string) => {
      setter(value);
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
    setCalls((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelectedCall(updated);
  }, []);

  const kpis = [
    { title: "Total", value: stats.totalCalls.toLocaleString("fr-FR"), icon: Phone, gradient: "from-blue-500 to-cyan-400", shadow: "shadow-blue-500/20" },
    { title: "Durée moy.", value: formatDuration(stats.avgDuration), icon: Clock, gradient: "from-indigo-500 to-violet-400", shadow: "shadow-indigo-500/20" },
    { title: "Réussite", value: `${stats.successRate}%`, icon: CheckCircle, gradient: "from-emerald-500 to-teal-400", shadow: "shadow-emerald-500/20" },
    { title: "Positif", value: `${stats.positiveSentiment}%`, icon: SmilePlus, gradient: "from-amber-500 to-orange-400", shadow: "shadow-amber-500/20" },
  ];

  // Group calls by date
  const groupedCalls = useMemo(() => {
    const groups: { date: string; calls: CallListItem[] }[] = [];
    let currentDate = "";
    for (const call of calls) {
      const date = formatDate(call.createdAt);
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ date, calls: [call] });
      } else {
        groups[groups.length - 1].calls.push(call);
      }
    }
    return groups;
  }, [calls]);

  return (
    <>
      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="group border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[12px] font-medium text-slate-500">{kpi.title}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{kpi.value}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${kpi.gradient} shadow-lg ${kpi.shadow}`}>
                    <Icon className="h-4.5 w-4.5 text-white" />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                  <ArrowUpRight className="h-3 w-3" />
                  Sur la période affichée
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Rechercher par nom ou téléphone..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-72 pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(e) => handleFilterChange(setStatus)(e.target.value)}
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm text-slate-700 outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {campaigns.length > 0 && (
          <select
            value={campaignId}
            onChange={(e) => handleFilterChange(setCampaignId)(e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm text-slate-700 outline-none"
          >
            <option value="">Toutes les campagnes</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <input type="date" value={dateFrom} onChange={(e) => handleFilterChange(setDateFrom)(e.target.value)} className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm text-slate-700 outline-none" />
          <span className="text-xs text-slate-400">au</span>
          <input type="date" value={dateTo} onChange={(e) => handleFilterChange(setDateTo)(e.target.value)} className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm text-slate-700 outline-none" />
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-slate-500">
            <X className="mr-1 h-3 w-3" /> Effacer
          </Button>
        )}
        <p className="ml-auto text-sm text-slate-500">{total} appel{total > 1 ? "s" : ""}</p>
      </div>

      {/* Calls list */}
      {calls.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25">
            <PhoneOff className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Aucun appel trouvé</h3>
          <p className="mb-6 mt-1 max-w-sm text-center text-sm text-slate-500">
            {hasActiveFilters ? "Aucun appel ne correspond à vos filtres." : "Les appels apparaîtront ici après votre premier appel."}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>Effacer les filtres</Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedCalls.map((group) => (
            <div key={group.date}>
              <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wider text-slate-400">
                {group.date}
              </p>
              <Card className="border-0 bg-white shadow-sm overflow-hidden">
                <CardContent className="p-0 divide-y divide-slate-50">
                  {group.calls.map((call) => {
                    const caller = getCallerInfo(call);
                    const direction = getDirection(call);
                    const st = STATUS_CONFIG[call.status] || STATUS_CONFIG.pending;
                    const sentKey = call.sentiment?.toLowerCase() || "";
                    const sentConfig = SENTIMENT_CONFIG[sentKey];
                    const SentIcon = sentConfig?.icon;

                    return (
                      <button
                        key={call.id}
                        onClick={() => { setSelectedCall(call); setDetailOpen(true); }}
                        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50/80"
                      >
                        {/* Direction + avatar */}
                        <div className="relative shrink-0">
                          <div className={`flex h-11 w-11 items-center justify-center rounded-full text-[13px] font-bold ${
                            direction === "outbound"
                              ? "bg-indigo-50 text-indigo-600"
                              : "bg-emerald-50 text-emerald-600"
                          }`}>
                            {caller.initials}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white ${
                            direction === "outbound" ? "bg-indigo-500" : "bg-emerald-500"
                          }`}>
                            {direction === "outbound"
                              ? <PhoneOutgoing className="h-2.5 w-2.5 text-white" />
                              : <PhoneIncoming className="h-2.5 w-2.5 text-white" />}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-slate-900 truncate">
                              {caller.name}
                            </span>
                            {caller.phone && caller.phone !== caller.name && (
                              <span className="text-[11px] text-slate-400 shrink-0">{caller.phone}</span>
                            )}
                            {SentIcon && <SentIcon className={`h-3.5 w-3.5 shrink-0 ${sentConfig.className}`} />}
                          </div>
                          {call.summary ? (
                            <p className="mt-0.5 text-[12px] text-slate-500 line-clamp-2 leading-relaxed">
                              {call.summary}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-[12px] text-slate-300 italic">Pas de résumé</p>
                          )}
                        </div>

                        {/* Right side */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="text-[11px] text-slate-400">{formatTime(call.createdAt)}</span>
                          <div className="flex items-center gap-2">
                            {call.duration && (
                              <span className="text-[11px] font-mono text-slate-400">
                                {formatDuration(call.duration)}
                              </span>
                            )}
                            <Badge className={`text-[10px] border-0 ${st.className}`}>
                              {st.label}
                            </Badge>
                          </div>
                          {call.campaign && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                              {call.campaign.name}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={() => doFetch({ append: true })} disabled={isPending} className="px-8">
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Chargement...</>
            ) : (
              "Voir plus d'appels"
            )}
          </Button>
        </div>
      )}

      {isPending && calls.length > 0 && (
        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Mise à jour...
          </div>
        </div>
      )}

      <CallDetailDialog
        call={selectedCall}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onCallUpdated={handleCallUpdated}
      />
    </>
  );
}
