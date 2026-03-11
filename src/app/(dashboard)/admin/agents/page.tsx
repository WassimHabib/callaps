import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Bot, Globe, Megaphone, Users } from "lucide-react";

export default async function AdminAgentsPage() {
  await requireSuperAdmin();

  const agents = await prisma.agent.findMany({
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { campaigns: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalCampaigns = agents.reduce((sum, a) => sum + a._count.campaigns, 0);
  const uniqueClients = new Set(agents.map((a) => a.userId)).size;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header
        title="Agents IA"
        description="Tous les agents de la plateforme"
      />
      <div className="p-6">
        {/* Stats */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card className="border-0 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                <Bot className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {agents.length}
                </p>
                <p className="text-xs text-slate-500">Agents au total</p>
              </div>
            </div>
          </Card>
          <Card className="border-0 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <Megaphone className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {totalCampaigns}
                </p>
                <p className="text-xs text-slate-500">Campagnes liées</p>
              </div>
            </div>
          </Card>
          <Card className="border-0 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {uniqueClients}
                </p>
                <p className="text-xs text-slate-500">Clients concernés</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Table */}
        <Card className="border-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-500">
                  Agent
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500">
                  Client
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-500">
                  Langue
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-500">
                  Campagnes
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-500">
                  Publié
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500">
                  Créé le
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-sm text-slate-400"
                  >
                    Aucun agent sur la plateforme
                  </TableCell>
                </TableRow>
              ) : (
                agents.map((agent) => (
                  <TableRow key={agent.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {agent.name}
                          </p>
                          {agent.description && (
                            <p className="max-w-xs truncate text-xs text-slate-400">
                              {agent.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm text-slate-700">
                          {agent.user.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {agent.user.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Globe className="h-3 w-3" />
                        {agent.language}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="border-0 bg-amber-50 text-xs font-semibold text-amber-600">
                        {agent._count.campaigns}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={`border-0 text-xs font-semibold ${
                          agent.published
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {agent.published ? "Oui" : "Non"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-400">
                        {agent.createdAt.toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
