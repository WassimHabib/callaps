import { getOrgContext, orgFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { notFound } from "next/navigation";
import { Bot, Phone, Users, Clock } from "lucide-react";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Brouillon", variant: "secondary" },
  scheduled: { label: "Planifiee", variant: "outline" },
  running: { label: "En cours", variant: "default" },
  paused: { label: "En pause", variant: "secondary" },
  completed: { label: "Terminee", variant: "outline" },
};

const callStatusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "secondary" },
  in_progress: { label: "En cours", variant: "default" },
  completed: { label: "Termine", variant: "outline" },
  failed: { label: "Echoue", variant: "destructive" },
  no_answer: { label: "Sans reponse", variant: "secondary" },
};

function ScoreBadge({ label, score }: { label: string | null; score: number | null }) {
  if (!label || score === null) {
    return <span className="text-xs text-muted-foreground">--</span>;
  }

  const config: Record<string, { className: string; text: string }> = {
    hot: {
      className: "bg-gradient-to-r from-red-500 to-orange-400 text-white border-0",
      text: "Chaud",
    },
    warm: {
      className: "bg-amber-100 text-amber-700 border-0",
      text: "Tiede",
    },
    cold: {
      className: "bg-slate-100 text-slate-500 border-0",
      text: "Froid",
    },
  };

  const c = config[label] ?? config.cold;

  return (
    <div className="flex items-center gap-2">
      <Badge className={c.className}>{c.text}</Badge>
      <span className="text-xs text-muted-foreground">{score}/100</span>
    </div>
  );
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getOrgContext();

  const campaign = await prisma.campaign.findFirst({
    where: { id, ...orgFilter(ctx) },
    include: {
      agent: { select: { name: true } },
      contacts: {
        include: {
          calls: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { score: { sort: "desc", nulls: "last" } },
      },
      _count: { select: { calls: true, contacts: true } },
    },
  });

  if (!campaign) notFound();

  const status = statusLabels[campaign.status] ?? statusLabels.draft;
  const completedCalls = await prisma.call.count({
    where: { campaignId: id, status: "completed" },
  });

  return (
    <div>
      <Header title={campaign.name} description={campaign.description ?? undefined} />
      <div className="space-y-6 p-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Bot className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Agent</p>
                <p className="font-medium">{campaign.agent.name}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-lg bg-violet-500/10 p-2">
                <Users className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contacts</p>
                <p className="font-medium">{campaign._count.contacts}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <Phone className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Appels</p>
                <p className="font-medium">
                  {completedCalls}/{campaign._count.contacts}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Statut</p>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contacts table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Telephone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Statut appel</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Prochaine action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaign.contacts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Aucun contact. Importez des contacts pour lancer la campagne.
                    </TableCell>
                  </TableRow>
                ) : (
                  campaign.contacts.map((contact) => {
                    const lastCall = contact.calls[0];
                    const callStatus = lastCall
                      ? callStatusLabels[lastCall.status] ?? callStatusLabels.pending
                      : null;
                    return (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          {contact.name}
                        </TableCell>
                        <TableCell>{contact.phone}</TableCell>
                        <TableCell>{contact.email || "--"}</TableCell>
                        <TableCell>
                          {callStatus ? (
                            <Badge variant={callStatus.variant}>
                              {callStatus.label}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Non appele
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <ScoreBadge label={contact.scoreLabel} score={contact.score} />
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {contact.nextAction || "--"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
