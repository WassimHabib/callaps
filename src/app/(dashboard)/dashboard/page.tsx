import { getOrgContext, orgFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Phone,
  PhoneCall,
  CheckCircle,
  TrendingUp,
  Plus,
  Bot,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const ctx = await getOrgContext();
  const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { name: true } });

  const [totalCalls, activeCalls, completedCalls, campaignsCount, agentsCount] =
    await Promise.all([
      prisma.call.count({
        where: { campaign: { ...orgFilter(ctx) } },
      }),
      prisma.call.count({
        where: { campaign: { ...orgFilter(ctx) }, status: "in_progress" },
      }),
      prisma.call.count({
        where: { campaign: { ...orgFilter(ctx) }, status: "completed" },
      }),
      prisma.campaign.count({ where: { ...orgFilter(ctx) } }),
      prisma.agent.count({ where: { ...orgFilter(ctx) } }),
    ]);

  const conversionRate =
    totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;

  const stats = [
    {
      title: "Appels totaux",
      value: totalCalls.toLocaleString("fr-FR"),
      icon: Phone,
      gradient: "from-blue-500 to-cyan-400",
      shadow: "shadow-blue-500/20",
      bg: "bg-blue-50",
    },
    {
      title: "En cours",
      value: activeCalls.toLocaleString("fr-FR"),
      icon: PhoneCall,
      gradient: "from-amber-500 to-orange-400",
      shadow: "shadow-amber-500/20",
      bg: "bg-amber-50",
    },
    {
      title: "Complétés",
      value: completedCalls.toLocaleString("fr-FR"),
      icon: CheckCircle,
      gradient: "from-emerald-500 to-teal-400",
      shadow: "shadow-emerald-500/20",
      bg: "bg-emerald-50",
    },
    {
      title: "Taux de réussite",
      value: `${conversionRate}%`,
      icon: TrendingUp,
      gradient: "from-indigo-500 to-violet-400",
      shadow: "shadow-indigo-500/20",
      bg: "bg-indigo-50",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header
        title={`Bonjour, ${user?.name?.split(" ")[0] ?? ""}`}
        description="Voici un aperçu de votre activité"
      />
      <div className="space-y-8 p-8">
        {/* Welcome banner */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Bienvenue sur votre espace
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {agentsCount} agent{agentsCount > 1 ? "s" : ""} configuré
                {agentsCount > 1 ? "s" : ""} &middot; {campaignsCount} campagne
                {campaignsCount > 1 ? "s" : ""}
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

        {/* Stats */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className="group relative overflow-hidden border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[13px] font-medium text-slate-500">
                        {stat.title}
                      </p>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                        {stat.value}
                      </p>
                    </div>
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg ${stat.shadow}`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-[12px] text-slate-400">
                    <ArrowUpRight className="h-3 w-3" />
                    Mis à jour en temps réel
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick actions */}
        {agentsCount === 0 && campaignsCount === 0 && (
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="border-0 bg-white shadow-sm">
              <CardContent className="flex items-center gap-5 p-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20">
                  <Bot className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">
                    Créez votre premier agent
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Configurez un agent IA avec un prompt personnalisé pour vos
                    appels.
                  </p>
                </div>
                <Link href="/agents/new">
                  <Button size="sm" className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20">
                    Créer
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white shadow-sm">
              <CardContent className="flex items-center gap-5 p-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20">
                  <Phone className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">
                    Lancez une campagne
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Importez vos contacts et lancez votre première campagne
                    d&apos;appels.
                  </p>
                </div>
                <Link href="/campaigns/new">
                  <Button size="sm" variant="outline">
                    Lancer
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
