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
import { Megaphone, Bot, Users, Phone } from "lucide-react";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-slate-100 text-slate-600" },
  scheduled: { label: "Planifiée", className: "bg-blue-50 text-blue-600" },
  running: { label: "En cours", className: "bg-emerald-50 text-emerald-600" },
  paused: { label: "En pause", className: "bg-amber-50 text-amber-600" },
  completed: { label: "Terminée", className: "bg-violet-50 text-violet-600" },
};

export default async function AdminCampaignsPage() {
  await requireSuperAdmin();

  const campaigns = await prisma.campaign.findMany({
    include: {
      user: { select: { name: true, email: true } },
      agent: { select: { name: true } },
      _count: { select: { contacts: true, calls: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const activeCampaigns = campaigns.filter((c) => c.status === "running").length;
  const totalContacts = campaigns.reduce((sum, c) => sum + c._count.contacts, 0);
  const totalCalls = campaigns.reduce((sum, c) => sum + c._count.calls, 0);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header
        title="Campagnes"
        description="Toutes les campagnes de la plateforme"
      />
      <div className="p-6">
        {/* Stats */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card className="border-0 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <Megaphone className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {campaigns.length}
                </p>
                <p className="text-xs text-slate-500">Total campagnes</p>
              </div>
            </div>
          </Card>
          <Card className="border-0 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <Megaphone className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {activeCampaigns}
                </p>
                <p className="text-xs text-slate-500">En cours</p>
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
                  {totalContacts.toLocaleString("fr-FR")}
                </p>
                <p className="text-xs text-slate-500">Contacts</p>
              </div>
            </div>
          </Card>
          <Card className="border-0 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                <Phone className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {totalCalls.toLocaleString("fr-FR")}
                </p>
                <p className="text-xs text-slate-500">Appels</p>
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
                  Campagne
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500">
                  Client
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500">
                  Agent
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-500">
                  Statut
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-500">
                  Contacts
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-500">
                  Appels
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500">
                  Créée le
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-sm text-slate-400"
                  >
                    Aucune campagne sur la plateforme
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((campaign) => {
                  const status =
                    statusConfig[campaign.status] ?? statusConfig.draft;
                  return (
                    <TableRow key={campaign.id} className="group">
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {campaign.name}
                          </p>
                          {campaign.description && (
                            <p className="max-w-xs truncate text-xs text-slate-400">
                              {campaign.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm text-slate-700">
                            {campaign.user.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {campaign.user.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Bot className="h-3.5 w-3.5" />
                          {campaign.agent.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={`border-0 text-[11px] font-medium ${status.className}`}
                        >
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="border-0 bg-blue-50 text-xs font-semibold text-blue-600">
                          {campaign._count.contacts}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="border-0 bg-emerald-50 text-xs font-semibold text-emerald-600">
                          {campaign._count.calls}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-400">
                          {campaign.createdAt.toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
