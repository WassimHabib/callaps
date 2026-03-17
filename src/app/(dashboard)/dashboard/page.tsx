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

  const dateStr = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header
        title="Tableau de bord"
        description="Vue d'ensemble de votre activité"
      />

      <div className="p-8 space-y-8">
        {/* Top row: Greeting + Quick actions */}
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Bonjour, {ctx.userName?.split(" ")[0] ?? ""}
            </h2>
            <p className="mt-1 text-sm text-slate-400 capitalize">{dateStr}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/agents/new">
              <Button
                variant="outline"
                className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouvel agent
              </Button>
            </Link>
            <Link href="/campaigns/new">
              <Button className="rounded-xl bg-indigo-600 text-white shadow-sm hover:bg-indigo-700">
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle campagne
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI row: 5 bento cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              title: "Appels totaux",
              value: totalCalls.toLocaleString("fr-FR"),
              sub: `${callsThisWeek} cette semaine`,
              icon: Phone,
              iconBg: "bg-indigo-50",
              iconColor: "text-indigo-500",
            },
            {
              title: "En cours",
              value: activeCalls.toLocaleString("fr-FR"),
              sub: "Appels actifs",
              icon: PhoneCall,
              iconBg: "bg-amber-50",
              iconColor: "text-amber-500",
            },
            {
              title: "Taux de réussite",
              value: `${conversionRate}%`,
              sub: `${completedCalls} complétés`,
              icon: TrendingUp,
              iconBg: "bg-emerald-50",
              iconColor: "text-emerald-500",
            },
            {
              title: "Durée moyenne",
              value: formatDuration(avgDuration),
              sub: `Total : ${formatTotalDuration(totalDuration)}`,
              icon: Clock,
              iconBg: "bg-violet-50",
              iconColor: "text-violet-500",
            },
            {
              title: "Aujourd'hui",
              value: callsToday.toLocaleString("fr-FR"),
              sub: activeCalls > 0
                ? `${activeCalls} en cours`
                : "appels passés",
              icon: CheckCircle,
              iconBg: "bg-rose-50",
              iconColor: "text-rose-500",
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className="border-0 bg-white rounded-2xl shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg}`}
                    >
                      <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                    </div>
                  </div>
                  <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[13px] font-medium text-slate-500">
                    {stat.title}
                  </p>
                  <p className="mt-0.5 text-[12px] text-slate-400">
                    {stat.sub}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main bento grid: Calls (3 cols, 2 rows) + Sentiment + Onboarding + Quick links */}
        <div className="grid gap-5 lg:grid-cols-5">
          {/* Recent calls - spans 3 cols, 2 rows */}
          <div className="lg:col-span-3 lg:row-span-2">
            <Card className="h-full border-0 bg-white rounded-2xl shadow-sm">
              <CardContent className="p-7">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Derniers appels
                    </h3>
                    <p className="mt-0.5 text-[13px] text-slate-400">
                      {agentsCount} agent{agentsCount > 1 ? "s" : ""} &middot;{" "}
                      {contactsCount} contact{contactsCount > 1 ? "s" : ""}
                      {activeCampaigns > 0 && (
                        <> &middot; {activeCampaigns} campagne{activeCampaigns > 1 ? "s" : ""} active{activeCampaigns > 1 ? "s" : ""}</>
                      )}
                    </p>
                  </div>
                  <Link
                    href="/calls"
                    className="flex items-center gap-1 rounded-lg bg-slate-50 px-3 py-1.5 text-[12px] font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
                  >
                    Voir tout <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>

                {recentCalls.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
                      <Phone className="h-6 w-6 text-slate-300" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-slate-500">
                      Aucun appel pour le moment
                    </p>
                    <p className="mt-1 text-[12px] text-slate-400">
                      Lancez votre premier appel pour commencer
                    </p>
                    <Link href="/phone-numbers">
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-4 rounded-xl"
                      >
                        Configurer un numéro
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {recentCalls.map((call) => {
                      const meta =
                        (call.metadata as Record<string, unknown>) || {};
                      const direction = meta.direction as string | undefined;
                      const toNumber = meta.toNumber as string | undefined;
                      const fromNumber = meta.fromNumber as string | undefined;
                      const callerDisplay =
                        call.contact?.name ||
                        call.contact?.phone ||
                        (direction === "outbound" ? toNumber : fromNumber) ||
                        "Inconnu";
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
                        "négatif": Frown,
                        negatif: Frown,
                        negative: Frown,
                      };
                      const SentimentIcon = call.sentiment
                        ? sentimentIcons[call.sentiment.toLowerCase()]
                        : null;

                      return (
                        <Link
                          key={call.id}
                          href="/calls"
                          className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50"
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              direction === "outbound"
                                ? "bg-indigo-50"
                                : "bg-emerald-50"
                            }`}
                          >
                            {direction === "outbound" ? (
                              <PhoneOutgoing className="h-4 w-4 text-indigo-500" />
                            ) : (
                              <PhoneIncoming className="h-4 w-4 text-emerald-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] font-medium text-slate-900 truncate">
                                {callerDisplay}
                              </p>
                              {SentimentIcon && (
                                <SentimentIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-[12px] text-slate-400 truncate">
                              {call.summary?.slice(0, 90) || "Pas de résumé"}
                              {call.summary && call.summary.length > 90
                                ? "..."
                                : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            {call.duration && (
                              <span className="text-[11px] font-medium text-slate-400">
                                {formatDuration(call.duration)}
                              </span>
                            )}
                            <Badge
                              className={`text-[10px] border-0 rounded-lg ${
                                statusColors[call.status] ||
                                "bg-slate-100 text-slate-500"
                              }`}
                            >
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

          {/* Sentiment card - right side, row 1 */}
          <div className="lg:col-span-2">
            <Card className="border-0 bg-white rounded-2xl shadow-sm">
              <CardContent className="p-7">
                <h3 className="text-base font-semibold text-slate-900 mb-5">
                  Sentiment
                </h3>
                {totalSentiment > 0 ? (
                  <div className="space-y-5">
                    {[
                      {
                        label: "Positif",
                        count: positif,
                        color: "bg-emerald-500",
                        icon: Smile,
                        iconBg: "bg-emerald-50",
                        iconColor: "text-emerald-500",
                        badgeBg: "bg-emerald-50 text-emerald-600",
                      },
                      {
                        label: "Neutre",
                        count: neutre,
                        color: "bg-slate-400",
                        icon: Meh,
                        iconBg: "bg-slate-100",
                        iconColor: "text-slate-500",
                        badgeBg: "bg-slate-100 text-slate-600",
                      },
                      {
                        label: "Négatif",
                        count: negatif,
                        color: "bg-rose-400",
                        icon: Frown,
                        iconBg: "bg-rose-50",
                        iconColor: "text-rose-500",
                        badgeBg: "bg-rose-50 text-rose-600",
                      },
                    ].map((s) => {
                      const Icon = s.icon;
                      const pct =
                        totalSentiment > 0
                          ? Math.round((s.count / totalSentiment) * 100)
                          : 0;
                      return (
                        <div key={s.label}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-9 w-9 items-center justify-center rounded-full ${s.iconBg}`}
                              >
                                <Icon
                                  className={`h-4.5 w-4.5 ${s.iconColor}`}
                                />
                              </div>
                              <span className="text-[13px] font-medium text-slate-700">
                                {s.label}
                              </span>
                            </div>
                            <Badge
                              className={`text-[11px] border-0 rounded-lg font-semibold ${s.badgeBg}`}
                            >
                              {pct}%
                            </Badge>
                          </div>
                          <div className="ml-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${s.color} transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-10">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50">
                      <Smile className="h-5 w-5 text-slate-300" />
                    </div>
                    <p className="mt-3 text-[13px] text-slate-400">
                      Pas encore de données
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Onboarding + Quick links - right side, row 2 */}
          <div className="lg:col-span-2 space-y-5">
            {/* Onboarding checklist */}
            {!allDone && (
              <Card className="border-0 bg-white rounded-2xl shadow-sm">
                <CardContent className="p-7">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-slate-900">
                      Pour démarrer
                    </h3>
                    <Badge className="text-[11px] border-0 rounded-lg bg-indigo-50 text-indigo-600 font-semibold">
                      {completedSteps}/{steps.length}
                    </Badge>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 rounded-full bg-slate-100 mb-5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 transition-all duration-500"
                      style={{
                        width: `${(completedSteps / steps.length) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    {steps.map((step) => {
                      const Icon = step.icon;
                      return (
                        <Link
                          key={step.label}
                          href={step.done ? "#" : step.href}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                            step.done ? "opacity-50" : "hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                              step.done ? "bg-emerald-50" : "bg-slate-50"
                            }`}
                          >
                            {step.done ? (
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Icon className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <span
                            className={`text-[13px] font-medium ${
                              step.done
                                ? "text-slate-400 line-through"
                                : "text-slate-700"
                            }`}
                          >
                            {step.label}
                          </span>
                          {!step.done && (
                            <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-slate-300" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick links */}
            <Card className="border-0 bg-white rounded-2xl shadow-sm">
              <CardContent className="p-7">
                <h3 className="text-base font-semibold text-slate-900 mb-4">
                  Accès rapide
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Agents",
                      href: "/agents",
                      icon: Bot,
                      iconBg: "bg-indigo-50",
                      iconColor: "text-indigo-500",
                    },
                    {
                      label: "Appels",
                      href: "/calls",
                      icon: PhoneCall,
                      iconBg: "bg-blue-50",
                      iconColor: "text-blue-500",
                    },
                    {
                      label: "Campagnes",
                      href: "/campaigns",
                      icon: Megaphone,
                      iconBg: "bg-amber-50",
                      iconColor: "text-amber-500",
                    },
                    {
                      label: "Intégrations",
                      href: "/integrations",
                      icon: Plug,
                      iconBg: "bg-emerald-50",
                      iconColor: "text-emerald-500",
                    },
                  ].map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex flex-col items-center gap-2.5 rounded-2xl border border-slate-100 px-4 py-5 transition-all hover:border-slate-200 hover:bg-slate-50 hover:shadow-sm"
                      >
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-xl ${link.iconBg}`}
                        >
                          <Icon className={`h-5 w-5 ${link.iconColor}`} />
                        </div>
                        <span className="text-[13px] font-medium text-slate-700">
                          {link.label}
                        </span>
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
