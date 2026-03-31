import { requireSuperAdmin } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Bot, Megaphone, Eye, Phone, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { ImpersonateButton } from "@/components/admin/impersonate-button";
import { ApproveButton } from "./approve-button";
import { SendAccessButton } from "./send-access-button";

export default async function AdminClientsPage() {
  await requireSuperAdmin();

  const clients = await prisma.user.findMany({
    where: { role: "client" },
    include: {
      _count: { select: { campaigns: true, agents: true } },
      agents: {
        select: {
          _count: { select: { campaigns: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get total calls per client
  const clientCallCounts = await prisma.call.groupBy({
    by: ["campaignId"],
    _count: true,
  });

  const campaignToClient = await prisma.campaign.findMany({
    select: { id: true, userId: true },
  });

  const callCountByClient: Record<string, number> = {};
  for (const cc of clientCallCounts) {
    const campaign = campaignToClient.find((c) => c.id === cc.campaignId);
    if (campaign) {
      callCountByClient[campaign.userId] =
        (callCountByClient[campaign.userId] || 0) + cc._count;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header title="Clients" description="Gestion des comptes clients" />
      <div className="p-6">
        {/* Stats rapides */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card className="border-0 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{clients.length}</p>
                <p className="text-xs text-slate-500">Clients actifs</p>
              </div>
            </div>
          </Card>
          <Card className="border-0 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                <Bot className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {clients.reduce((sum, c) => sum + c._count.agents, 0)}
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
                  {clients.reduce((sum, c) => sum + c._count.campaigns, 0)}
                </p>
                <p className="text-xs text-slate-500">Campagnes au total</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Table */}
        <Card className="border-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-500">Client</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500">Entreprise</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 text-center">Agents</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 text-center">Campagnes</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 text-center">Appels</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 text-center">Statut</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500">Inscription</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-slate-400">
                    Aucun client pour le moment
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id} className="group">
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{client.name}</p>
                        <p className="text-xs text-slate-400">{client.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">{client.company || "—"}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="border-0 bg-indigo-50 text-indigo-600 text-xs font-semibold">
                        {client._count.agents}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="border-0 bg-amber-50 text-amber-600 text-xs font-semibold">
                        {client._count.campaigns}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="border-0 bg-emerald-50 text-emerald-600 text-xs font-semibold">
                        {callCountByClient[client.id] || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {client.approved ? (
                        <Badge className="border-0 bg-emerald-50 text-emerald-600 text-xs">
                          Actif
                        </Badge>
                      ) : (
                        <ApproveButton clientId={client.id} clientName={client.name} />
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-400">
                        {client.createdAt.toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <SendAccessButton clientId={client.id} hasPassword={!!client.passwordHash} />
                        <ImpersonateButton clientId={client.id} />
                        <Link href={`/admin/clients/${client.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Gérer
                          </Button>
                        </Link>
                      </div>
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
