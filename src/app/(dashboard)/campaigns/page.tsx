import { getOrgContext, orgFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus, Bot, Users, Phone } from "lucide-react";
import Link from "next/link";
import { CampaignQuickActions } from "@/components/campaigns/campaign-quick-actions";

const statusConfig: Record<
  string,
  { label: string; className: string; dotColor: string }
> = {
  draft: {
    label: "Brouillon",
    className: "bg-slate-100 text-slate-600",
    dotColor: "bg-slate-400",
  },
  scheduled: {
    label: "Planifiee",
    className: "bg-blue-50 text-blue-600",
    dotColor: "bg-blue-500",
  },
  running: {
    label: "En cours",
    className: "bg-emerald-50 text-emerald-600",
    dotColor: "bg-emerald-500 animate-pulse",
  },
  paused: {
    label: "En pause",
    className: "bg-amber-50 text-amber-600",
    dotColor: "bg-amber-500",
  },
  completed: {
    label: "Terminee",
    className: "bg-violet-50 text-violet-600",
    dotColor: "bg-violet-500",
  },
};

const GRADIENT_PAIRS = [
  { from: "from-indigo-500", to: "to-violet-500" },
  { from: "from-emerald-500", to: "to-teal-500" },
  { from: "from-rose-500", to: "to-pink-500" },
  { from: "from-amber-500", to: "to-orange-500" },
  { from: "from-cyan-500", to: "to-blue-500" },
  { from: "from-fuchsia-500", to: "to-purple-500" },
];

export default async function CampaignsPage() {
  const ctx = await getOrgContext();

  const campaigns = await prisma.campaign.findMany({
    where: { ...orgFilter(ctx) },
    include: {
      agent: { select: { name: true } },
      _count: { select: { contacts: true, calls: true } },
      calls: {
        where: { status: "completed" },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const campaignsWithStats = campaigns.map((campaign) => {
    const totalContacts = campaign._count.contacts;
    const completedCalls = campaign.calls.length;
    const progressPercent =
      totalContacts > 0
        ? Math.min(100, Math.round((completedCalls / totalContacts) * 100))
        : 0;

    return { ...campaign, totalContacts, completedCalls, progressPercent };
  });

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header title="Campagnes" description="Gerez vos campagnes d'appels" />
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {campaigns.length} campagne{campaigns.length > 1 ? "s" : ""}
          </p>
          <Link href="/campaigns/new">
            <Button className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle campagne
            </Button>
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25">
              <Megaphone className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              Aucune campagne
            </h3>
            <p className="mb-6 mt-1 max-w-sm text-center text-sm text-slate-500">
              Creez votre premiere campagne pour lancer des appels automatises.
            </p>
            <Link href="/campaigns/new">
              <Button className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25">
                <Plus className="mr-2 h-4 w-4" />
                Creer une campagne
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {campaignsWithStats.map((campaign, i) => {
              const status =
                statusConfig[campaign.status] ?? statusConfig.draft;
              const gradient = GRADIENT_PAIRS[i % GRADIENT_PAIRS.length];

              return (
                <Card
                  key={campaign.id}
                  className="group relative overflow-hidden border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  {/* Gradient header band */}
                  <div
                    className={`h-2 bg-gradient-to-r ${gradient.from} ${gradient.to}`}
                  />

                  <CardContent className="p-5">
                    <Link href={`/campaigns/${campaign.id}`}>
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-slate-900 truncate pr-3">
                          {campaign.name}
                        </h3>
                        <Badge
                          className={`shrink-0 rounded-lg border-0 text-[11px] font-medium ${status.className}`}
                        >
                          <span
                            className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${status.dotColor}`}
                          />
                          {status.label}
                        </Badge>
                      </div>
                      {campaign.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                          {campaign.description}
                        </p>
                      )}

                      {/* Progress bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] text-slate-400">
                            Progression
                          </span>
                          <span className="text-[11px] font-semibold text-indigo-600">
                            {campaign.progressPercent}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${gradient.from} ${gradient.to} transition-all duration-500`}
                            style={{
                              width: `${campaign.progressPercent}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Stats chips */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-600">
                          <Bot className="h-3 w-3 text-slate-400" />
                          {campaign.agent.name}
                        </div>
                        <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-600">
                          <Users className="h-3 w-3 text-slate-400" />
                          {campaign.completedCalls}/{campaign.totalContacts}
                        </div>
                        <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-600">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {campaign._count.calls} appels
                        </div>
                      </div>
                    </Link>

                    {/* Quick actions */}
                    <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                      <CampaignQuickActions
                        campaignId={campaign.id}
                        status={campaign.status}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
