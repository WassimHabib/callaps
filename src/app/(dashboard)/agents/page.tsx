import { getOrgContext, orgFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Plus, Settings, Globe } from "lucide-react";
import Link from "next/link";

export default async function AgentsPage() {
  const ctx = await getOrgContext();

  const agents = await prisma.agent.findMany({
    where: { ...orgFilter(ctx) },
    include: { _count: { select: { campaigns: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header title="Agents IA" description="Configurez vos agents d'appels intelligents" />
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {agents.length} agent{agents.length > 1 ? "s" : ""}
          </p>
          <Link href="/agents/new">
            <Button className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25">
              <Plus className="mr-2 h-4 w-4" />
              Nouvel agent
            </Button>
          </Link>
        </div>

        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              Aucun agent
            </h3>
            <p className="mb-6 mt-1 max-w-sm text-center text-sm text-slate-500">
              Créez votre premier agent IA pour commencer à lancer des campagnes
              d&apos;appels intelligents.
            </p>
            <Link href="/agents/new">
              <Button className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25">
                <Plus className="mr-2 h-4 w-4" />
                Créer un agent
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Card
                key={agent.id}
                className="group border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {agent.name}
                        </h3>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                          <Globe className="h-3 w-3" />
                          {agent.language}
                        </div>
                      </div>
                    </div>
                    <Link href={`/agents/${agent.id}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                  {agent.description && (
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-500">
                      {agent.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className="rounded-lg bg-slate-100 text-[11px] font-medium text-slate-600"
                    >
                      {agent._count.campaigns} campagne
                      {agent._count.campaigns > 1 ? "s" : ""}
                    </Badge>
                    <span className="text-[11px] text-slate-400">
                      {agent.createdAt.toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
