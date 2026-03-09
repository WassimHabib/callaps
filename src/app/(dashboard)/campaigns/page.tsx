import { getOrgContext, orgFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus, Bot, Users } from "lucide-react";
import Link from "next/link";

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  draft: {
    label: "Brouillon",
    className: "bg-slate-100 text-slate-600",
  },
  scheduled: {
    label: "Planifiée",
    className: "bg-blue-50 text-blue-600",
  },
  running: {
    label: "En cours",
    className: "bg-emerald-50 text-emerald-600",
  },
  paused: {
    label: "En pause",
    className: "bg-amber-50 text-amber-600",
  },
  completed: {
    label: "Terminée",
    className: "bg-violet-50 text-violet-600",
  },
};

export default async function CampaignsPage() {
  const ctx = await getOrgContext();

  const campaigns = await prisma.campaign.findMany({
    where: { ...orgFilter(ctx) },
    include: {
      agent: { select: { name: true } },
      _count: { select: { contacts: true, calls: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header title="Campagnes" description="Gérez vos campagnes d'appels" />
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
              Créez votre première campagne pour lancer des appels automatisés.
            </p>
            <Link href="/campaigns/new">
              <Button className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25">
                <Plus className="mr-2 h-4 w-4" />
                Créer une campagne
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => {
              const status = statusConfig[campaign.status] ?? statusConfig.draft;
              return (
                <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                  <Card className="group h-full border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-slate-900">
                          {campaign.name}
                        </h3>
                        <Badge
                          className={`rounded-lg border-0 text-[11px] font-medium ${status.className}`}
                        >
                          {status.label}
                        </Badge>
                      </div>
                      {campaign.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                          {campaign.description}
                        </p>
                      )}
                      <div className="mt-5 flex items-center gap-4 border-t border-slate-100 pt-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Bot className="h-3.5 w-3.5" />
                          {campaign.agent.name}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {campaign._count.contacts} contacts
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
