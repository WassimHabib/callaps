import { getOrgContext, orgFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Plus,
  Settings,
  Globe,
  Megaphone,
  CheckCircle2,
  Clock,
  Mic,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { voices } from "@/lib/voices";

// Avatar based on voice gender
const AVATARS: Record<string, string[]> = {
  Female: [
    "https://api.dicebear.com/9.x/notionists/svg?seed=Emma&backgroundColor=c0aede",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Camille&backgroundColor=d1d4f9",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Hailey&backgroundColor=ffd5dc",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Sophie&backgroundColor=b6e3f4",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Chloe&backgroundColor=ffdfbf",
  ],
  Male: [
    "https://api.dicebear.com/9.x/notionists/svg?seed=Pierre&backgroundColor=b6e3f4",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Louis&backgroundColor=c0aede",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Alejandro&backgroundColor=d1d4f9",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Nico&backgroundColor=ffd5dc",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Leland&backgroundColor=ffdfbf",
  ],
};

function getAvatarUrl(voiceId: string, agentName: string): string {
  const voice = voices.find((v) => v.id === voiceId);
  const gender = voice?.gender || "Female";
  // Use agent name as seed for consistent avatar per agent
  const seed = encodeURIComponent(agentName);
  const bgColors: Record<string, string> = {
    Female: "c0aede",
    Male: "b6e3f4",
  };
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}&backgroundColor=${bgColors[gender]}`;
}

function getVoiceName(voiceId: string): string | null {
  const voice = voices.find((v) => v.id === voiceId);
  return voice?.name || null;
}

const LANG_LABELS: Record<string, string> = {
  "fr-FR": "Francais",
  "en-US": "Anglais (US)",
  "en-GB": "Anglais (UK)",
  "es-ES": "Espagnol",
  "de-DE": "Allemand",
  "ar-SA": "Arabe",
  "it-IT": "Italien",
  "pt-BR": "Portugais",
  "nl-NL": "Neerlandais",
  "multi": "Multilingue",
};

const GRADIENT_PAIRS = [
  { from: "from-indigo-500", to: "to-violet-500", shadow: "shadow-indigo-500/20", bg: "bg-indigo-500/5" },
  { from: "from-emerald-500", to: "to-teal-500", shadow: "shadow-emerald-500/20", bg: "bg-emerald-500/5" },
  { from: "from-rose-500", to: "to-pink-500", shadow: "shadow-rose-500/20", bg: "bg-rose-500/5" },
  { from: "from-amber-500", to: "to-orange-500", shadow: "shadow-amber-500/20", bg: "bg-amber-500/5" },
  { from: "from-cyan-500", to: "to-blue-500", shadow: "shadow-cyan-500/20", bg: "bg-cyan-500/5" },
  { from: "from-fuchsia-500", to: "to-purple-500", shadow: "shadow-fuchsia-500/20", bg: "bg-fuchsia-500/5" },
];

export default async function AgentsPage() {
  const ctx = await getOrgContext();

  const agents = await prisma.agent.findMany({
    where: { ...orgFilter(ctx), archived: false },
    include: {
      _count: { select: { campaigns: true } },
      campaigns: {
        select: {
          _count: { select: { calls: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header
        title="Agents IA"
        description="Configurez vos agents d'appels intelligents"
      />
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
              Creez votre premier agent IA pour commencer a lancer des campagnes
              d&apos;appels intelligents.
            </p>
            <Link href="/agents/new">
              <Button className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25">
                <Plus className="mr-2 h-4 w-4" />
                Creer un agent
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent, i) => {
              const gradient = GRADIENT_PAIRS[i % GRADIENT_PAIRS.length];
              const avatarUrl = getAvatarUrl(agent.voiceId, agent.name);
              const voiceName = getVoiceName(agent.voiceId);
              const totalCalls = agent.campaigns.reduce(
                (sum, c) => sum + c._count.calls,
                0
              );

              return (
                <Link key={agent.id} href={`/agents/${agent.id}`}>
                  <Card className="group relative overflow-hidden border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    {/* Gradient header band */}
                    <div
                      className={`h-24 bg-gradient-to-r ${gradient.from} ${gradient.to} relative`}
                    >
                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-50" />
                      {/* Status badge */}
                      <div className="absolute right-3 top-3">
                        <Badge
                          className={`border-0 text-[10px] font-semibold ${
                            agent.published
                              ? "bg-white/20 text-white backdrop-blur-sm"
                              : "bg-black/20 text-white/80 backdrop-blur-sm"
                          }`}
                        >
                          {agent.published ? (
                            <>
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Publie
                            </>
                          ) : (
                            <>
                              <Clock className="mr-1 h-3 w-3" />
                              Brouillon
                            </>
                          )}
                        </Badge>
                      </div>
                      {/* Settings icon on hover */}
                      <div className="absolute right-3 bottom-3 opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                          <Settings className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    </div>

                    {/* Avatar */}
                    <div className="relative px-5">
                      <div className="-mt-10 mb-3 flex items-end gap-3">
                        <div
                          className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg ${gradient.shadow}`}
                        >
                          <Image
                            src={avatarUrl}
                            alt={agent.name}
                            width={80}
                            height={80}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="mb-1 min-w-0">
                          <h3 className="truncate text-lg font-bold text-slate-900">
                            {agent.name}
                          </h3>
                          {voiceName && (
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <Mic className="h-3 w-3" />
                              Voix : {voiceName}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <CardContent className="px-5 pb-5 pt-0">
                      {agent.description && (
                        <p className="mb-4 line-clamp-2 text-[13px] leading-relaxed text-slate-500">
                          {agent.description}
                        </p>
                      )}

                      {/* Info chips */}
                      <div className="mb-4 flex flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-600">
                          <Globe className="h-3 w-3 text-slate-400" />
                          {LANG_LABELS[agent.language] || agent.language}
                        </div>
                        <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-600">
                          <Megaphone className="h-3 w-3 text-slate-400" />
                          {agent._count.campaigns} campagne
                          {agent._count.campaigns > 1 ? "s" : ""}
                        </div>
                        {totalCalls > 0 && (
                          <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-600">
                            <Bot className="h-3 w-3 text-slate-400" />
                            {totalCalls} appel{totalCalls > 1 ? "s" : ""}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-[11px] text-slate-400">
                          Cree le{" "}
                          {agent.createdAt.toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <div
                          className={`flex items-center gap-1 text-[11px] font-medium ${
                            agent.published
                              ? "text-emerald-600"
                              : "text-slate-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              agent.published ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          />
                          {agent.published ? "Actif" : "Inactif"}
                        </div>
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
