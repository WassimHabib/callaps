import { getOrgContext, orgFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone,
  PhoneCall,
  CheckCircle,
  TrendingUp,
  Plus,
  Bot,
  ArrowUpRight,
  Clock,
  Users,
  Megaphone,
  Plug,
  PhoneIncoming,
  PhoneOutgoing,
  Smile,
  Meh,
  Frown,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const ctx = await getOrgContext();
  const filter = orgFilter(ctx);

  // Date ranges
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const [
    totalCalls,
    callsToday,
    callsThisWeek,
    completedCalls,
    activeCalls,
    campaignsCount,
    activeCampaigns,
    agentsCount,
    contactsCount,
    recentCalls,
    sentimentCounts,
    totalDurationResult,
  ] = await Promise.all([
    // Total calls (campaign + standalone)
    prisma.call.count({
      where: {
        OR: [
          { campaign: { ...filter } },
          { ...filter },
        ],
      },
    }),
    // Calls today
    prisma.call.count({
      where: {
        createdAt: { gte: todayStart },
        OR: [{ campaign: { ...filter } }, { ...filter }],
      },
    }),
    // Calls this week
    prisma.call.count({
      where: {
        createdAt: { gte: weekStart },
        OR: [{ campaign: { ...filter } }, { ...filter }],
      },
    }),
    // Completed calls
    prisma.call.count({
      where: {
        status: "completed",
        OR: [{ campaign: { ...filter } }, { ...filter }],
      },
    }),
    // Active calls
    prisma.call.count({
      where: {
        status: "in_progress",
        OR: [{ campaign: { ...filter } }, { ...filter }],
      },
    }),
    // Campaigns
    prisma.campaign.count({ where: { ...filter } }),
    prisma.campaign.count({ where: { ...filter, status: "running" } }),
    // Agents
    prisma.agent.count({ where: { ...filter, archived: false } }),
    // Contacts
    prisma.contact.count({ where: { ...filter } }),
    // Recent calls (last 10)
    prisma.call.findMany({
      where: {
        OR: [{ campaign: { ...filter } }, { ...filter }],
        status: { in: ["completed", "failed", "no_answer"] },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        status: true,
        duration: true,
        summary: true,
        sentiment: true,
        metadata: true,
        createdAt: true,
        contact: { select: { name: true, phone: true } },
      },
    }),
    // Sentiment breakdown
    prisma.call.groupBy({
      by: ["sentiment"],
      where: {
        sentiment: { not: null },
        OR: [{ campaign: { ...filter } }, { ...filter }],
      },
      _count: true,
    }),
    // Total call duration
    prisma.call.aggregate({
      where: {
        status: "completed",
        OR: [{ campaign: { ...filter } }, { ...filter }],
      },
      _sum: { duration: true },
    }),
  ]);

  const totalDuration = totalDurationResult._sum.duration || 0;
  const avgDuration = completedCalls > 0 ? Math.round(totalDuration / completedCalls) : 0;
  const conversionRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m${s}s` : `${m}m`;
  };

  const formatTotalDuration = (seconds: number) => {
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return `${h}h${m > 0 ? `${m}m` : ""}`;
  };

  const sentimentMap = Object.fromEntries(
    sentimentCounts.map((s) => [s.sentiment?.toLowerCase() || "", s._count])
  );
  const positif = sentimentMap["positif"] || 0;
  const neutre = sentimentMap["neutre"] || sentimentMap["neutral"] || 0;
  const negatif = sentimentMap["négatif"] || sentimentMap["negatif"] || sentimentMap["negative"] || 0;
  const totalSentiment = positif + neutre + negatif;

  // Onboarding steps
  const steps = [
    { done: agentsCount > 0, label: "Créer un agent IA", href: "/agents/new", icon: Bot },
    { done: totalCalls > 0, label: "Passer votre premier appel", href: "/phone-numbers", icon: Phone },
    { done: campaignsCount > 0, label: "Lancer une campagne", href: "/campaigns/new", icon: Megaphone },
    { done: contactsCount > 0, label: "Importer des contacts", href: "/contacts", icon: Users },
  ];
  const completedSteps = steps.filter((s) => s.done).length;
  const allDone = completedSteps === steps.length;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header
        title={`Bonjour, ${ctx.userName?.split(" ")[0] ?? ""} 👋`}
        description="Voici un aperçu de votre activité"
      />
      <div className="space-y-6 p-8">
        {/* Welcome banner with quick actions */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {activeCalls > 0
                  ? `${activeCalls} appel${activeCalls > 1 ? "s" : ""} en cours`
                  : callsToday > 0
                    ? `${callsToday} appel${callsToday > 1 ? "s" : ""} aujourd'hui`
                    : "Bienvenue sur votre espace"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {agentsCount} agent{agentsCount > 1 ? "s" : ""} &middot; {contactsCount} contact{contactsCount > 1 ? "s" : ""} &middot; {activeCampaigns > 0 ? `${activeCampaigns} campagne${activeCampaigns > 1 ? "s" : ""} active${activeCampaigns > 1 ? "s" : ""}` : `${campaignsCount} campagne${campaignsCount > 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/agents/new">
                <Button
                  variant="outline"
                  className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvel agent
                </Button>
              </Link>
              <Link href="/campaigns/new">
                <Button className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle campagne
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[
            { title: "Appels totaux", value: totalCalls.toLocaleString("fr-FR"), sub: `${callsThisWeek} cette semaine`, icon: Phone, gradient: "from-blue-500 to-cyan-400", shadow: "shadow-blue-500/20" },
            { title: "En cours", value: activeCalls.toLocaleString("fr-FR"), sub: "Appels actifs", icon: PhoneCall, gradient: "from-amber-500 to-orange-400", shadow: "shadow-amber-500/20" },
            { title: "Taux réussite", value: `${conversionRate}%`, sub: `${completedCalls} complétés`, icon: TrendingUp, gradient: "from-emerald-500 to-teal-400", shadow: "shadow-emerald-500/20" },
            { title: "Durée moyenne", value: formatDuration(avgDuration), sub: `Total : ${formatTotalDuration(totalDuration)}`, icon: Clock, gradient: "from-indigo-500 to-violet-400", shadow: "shadow-indigo-500/20" },
            { title: "Aujourd'hui", value: callsToday.toLocaleString("fr-FR"), sub: new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }), icon: CheckCircle, gradient: "from-pink-500 to-rose-400", shadow: "shadow-pink-500/20" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="group border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[12px] font-medium text-slate-500">{stat.title}</p>
                      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{stat.value}</p>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg ${stat.shadow}`}>
                      <Icon className="h-4.5 w-4.5 text-white" />
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">{stat.sub}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent calls */}
          <div className="lg:col-span-2">
            <Card className="border-0 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Derniers appels</h3>
                  <Link href="/calls" className="text-[12px] font-medium text-indigo-500 hover:text-indigo-600 flex items-center gap-1">
                    Voir tout <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
                {recentCalls.length === 0 ? (
                  <div className="py-12 text-center">
                    <Phone className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-sm text-slate-500">Aucun appel pour le moment</p>
                    <Link href="/phone-numbers">
                      <Button size="sm" variant="outline" className="mt-3">
                        Configurer un numéro
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentCalls.map((call) => {
                      const meta = (call.metadata as Record<string, unknown>) || {};
                      const direction = meta.direction as string | undefined;
                      const toNumber = meta.toNumber as string | undefined;
                      const fromNumber = meta.fromNumber as string | undefined;
                      const callerDisplay = call.contact?.name || call.contact?.phone || (direction === "outbound" ? toNumber : fromNumber) || "Inconnu";
                      const statusColors: Record<string, string> = {
                        completed: "bg-emerald-50 text-emerald-600",
                        failed: "bg-red-50 text-red-600",
                        no_answer: "bg-slate-100 text-slate-500",
                      };
                      const statusLabels: Record<string, string> = {
                        completed: "Terminé",
                        failed: "Échoué",
                        no_answer: "Sans réponse",
                      };
                      const sentimentIcons: Record<string, typeof Smile> = {
                        positif: Smile,
                        neutre: Meh,
                        neutral: Meh,
                        négatif: Frown,
                        negatif: Frown,
                        negative: Frown,
                      };
                      const SentimentIcon = call.sentiment ? sentimentIcons[call.sentiment.toLowerCase()] : null;

                      return (
                        <Link key={call.id} href={`/calls`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${direction === "outbound" ? "bg-indigo-50" : "bg-emerald-50"}`}>
                            {direction === "outbound"
                              ? <PhoneOutgoing className="h-4 w-4 text-indigo-500" />
                              : <PhoneIncoming className="h-4 w-4 text-emerald-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] font-medium text-slate-900 truncate">{callerDisplay}</p>
                              {SentimentIcon && <SentimentIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">
                              {call.summary?.slice(0, 80) || "Pas de résumé"}
                              {call.summary && call.summary.length > 80 ? "..." : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {call.duration && (
                              <span className="text-[11px] text-slate-400">{formatDuration(call.duration)}</span>
                            )}
                            <Badge className={`text-[10px] border-0 ${statusColors[call.status] || "bg-slate-100 text-slate-500"}`}>
                              {statusLabels[call.status] || call.status}
                            </Badge>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Sentiment breakdown */}
            {totalSentiment > 0 && (
              <Card className="border-0 bg-white shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Sentiment des appels</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Positif", count: positif, color: "bg-emerald-500", icon: Smile, textColor: "text-emerald-600" },
                      { label: "Neutre", count: neutre, color: "bg-slate-400", icon: Meh, textColor: "text-slate-500" },
                      { label: "Négatif", count: negatif, color: "bg-red-400", icon: Frown, textColor: "text-red-500" },
                    ].map((s) => {
                      const Icon = s.icon;
                      const pct = totalSentiment > 0 ? Math.round((s.count / totalSentiment) * 100) : 0;
                      return (
                        <div key={s.label}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-3.5 w-3.5 ${s.textColor}`} />
                              <span className="text-[12px] font-medium text-slate-600">{s.label}</span>
                            </div>
                            <span className="text-[12px] font-semibold text-slate-900">{pct}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-full rounded-full ${s.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Onboarding checklist */}
            {!allDone && (
              <Card className="border-0 bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900">Pour démarrer</h3>
                    <span className="text-[11px] font-medium text-slate-400">{completedSteps}/{steps.length}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 rounded-full bg-slate-100 mb-4 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                      style={{ width: `${(completedSteps / steps.length) * 100}%` }}
                    />
                  </div>
                  <div className="space-y-2">
                    {steps.map((step) => {
                      const Icon = step.icon;
                      return (
                        <Link
                          key={step.label}
                          href={step.done ? "#" : step.href}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${step.done ? "opacity-60" : "hover:bg-slate-50"}`}
                        >
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${step.done ? "bg-emerald-50" : "bg-slate-100"}`}>
                            {step.done
                              ? <CheckCircle className="h-4 w-4 text-emerald-500" />
                              : <Icon className="h-4 w-4 text-slate-400" />}
                          </div>
                          <span className={`text-[13px] font-medium ${step.done ? "text-slate-400 line-through" : "text-slate-700"}`}>
                            {step.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick links */}
            <Card className="border-0 bg-white shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 mb-3">Accès rapide</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Agents", href: "/agents", icon: Bot, gradient: "from-indigo-500 to-violet-500" },
                    { label: "Appels", href: "/calls", icon: PhoneCall, gradient: "from-blue-500 to-cyan-400" },
                    { label: "Campagnes", href: "/campaigns", icon: Megaphone, gradient: "from-amber-500 to-orange-400" },
                    { label: "Intégrations", href: "/integrations", icon: Plug, gradient: "from-emerald-500 to-teal-400" },
                  ].map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50"
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${link.gradient} shadow-sm`}>
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-[12px] font-medium text-slate-700">{link.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
