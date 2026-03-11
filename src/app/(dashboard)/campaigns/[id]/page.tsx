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
import {
  Bot,
  Phone,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  PhoneOff,
  TrendingUp,
  Timer,
  Flame,
  Zap,
} from "lucide-react";
import { WorkflowEditor } from "@/components/campaigns/workflow-editor";
import { CampaignActionsBar } from "@/components/campaigns/campaign-actions-bar";
import { getCampaignStats } from "@/app/(dashboard)/campaigns/actions";
import type { WorkflowRule } from "@/lib/workflows";

const statusLabels: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  draft: { label: "Brouillon", variant: "secondary" },
  scheduled: { label: "Planifiee", variant: "outline" },
  running: { label: "En cours", variant: "default" },
  paused: { label: "En pause", variant: "secondary" },
  completed: { label: "Terminee", variant: "outline" },
};

const callStatusLabels: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "En attente", variant: "secondary" },
  in_progress: { label: "En cours", variant: "default" },
  completed: { label: "Termine", variant: "outline" },
  failed: { label: "Echoue", variant: "destructive" },
  no_answer: { label: "Sans reponse", variant: "secondary" },
};

function ScoreBadge({
  label,
  score,
}: {
  label: string | null;
  score: number | null;
}) {
  if (!label || score === null) {
    return <span className="text-xs text-muted-foreground">--</span>;
  }

  const config: Record<string, { className: string; text: string }> = {
    hot: {
      className:
        "bg-gradient-to-r from-red-500 to-orange-400 text-white border-0",
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string; order?: string }>;
}) {
  const { id } = await params;
  const { sort = "score", order = "desc" } = await searchParams;
  const ctx = await getOrgContext();

  // Build sort order for contacts
  type ContactOrderBy = Record<string, "asc" | "desc" | { sort: "asc" | "desc"; nulls: "last" }>;
  const contactOrderBy: ContactOrderBy = {};
  if (sort === "name") {
    contactOrderBy.name = order === "asc" ? "asc" : "desc";
  } else if (sort === "phone") {
    contactOrderBy.phone = order === "asc" ? "asc" : "desc";
  } else if (sort === "email") {
    contactOrderBy.email = order === "asc" ? "asc" : "desc";
  } else {
    // Default: sort by score
    contactOrderBy.score = { sort: order === "asc" ? "asc" : "desc", nulls: "last" };
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id, ...orgFilter(ctx) },
    include: {
      agent: { select: { name: true } },
      contacts: {
        include: {
          calls: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: contactOrderBy,
      },
      _count: { select: { calls: true, contacts: true } },
    },
  });

  if (!campaign) notFound();

  const status = statusLabels[campaign.status] ?? statusLabels.draft;
  const stats = await getCampaignStats(id);

  const callRate = campaign.callRateCount;
  const callRateMin = campaign.callRateMinutes;

  return (
    <div>
      <Header
        title={campaign.name}
        description={campaign.description ?? undefined}
      />
      <div className="space-y-6 p-6">
        {/* Actions bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant={status.variant} className="text-sm px-3 py-1">
              {status.label}
            </Badge>
            <span className="text-sm text-muted-foreground">
              <Zap className="mr-1 inline h-3.5 w-3.5" />
              {callRate} appels / {callRateMin} min
            </span>
          </div>
          <CampaignActionsBar
            campaignId={campaign.id}
            status={campaign.status}
          />
        </div>

        {/* Progress bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">
                Progression de la campagne
              </span>
              <span className="text-sm font-bold text-indigo-600">
                {stats.completionPercent}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                style={{ width: `${stats.completionPercent}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>
                {stats.calledContacts} / {stats.totalContacts} contacts appeles
              </span>
              {campaign.status === "running" && (
                <span className="text-emerald-600 font-medium">En cours...</span>
              )}
              {campaign.status === "completed" && (
                <span className="text-violet-600 font-medium">Terminee</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Bot className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Agent</p>
                <p className="font-medium text-sm">{campaign.agent.name}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-lg bg-violet-500/10 p-2">
                <Users className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Appeles</p>
                <p className="font-medium text-sm">
                  {stats.calledContacts}/{stats.totalContacts}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reussis</p>
                <p className="font-medium text-sm">{stats.completed}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-lg bg-red-500/10 p-2">
                <XCircle className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Echoues</p>
                <p className="font-medium text-sm">{stats.failed}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <PhoneOff className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sans reponse</p>
                <p className="font-medium text-sm">{stats.noAnswer}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-lg bg-indigo-500/10 p-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taux de reussite</p>
                <p className="font-medium text-sm">{stats.successRate}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary stats row */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-lg bg-sky-500/10 p-2">
                <Timer className="h-4 w-4 text-sky-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duree moyenne</p>
                <p className="font-medium text-sm">
                  {stats.avgDuration > 0
                    ? `${Math.floor(stats.avgDuration / 60)}m ${stats.avgDuration % 60}s`
                    : "--"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-lg bg-red-500/10 p-2">
                <Flame className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Chauds</p>
                <p className="font-medium text-sm">{stats.hot}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <Flame className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tiedes</p>
                <p className="font-medium text-sm">{stats.warm}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-lg bg-slate-500/10 p-2">
                <Flame className="h-4 w-4 text-slate-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Froids</p>
                <p className="font-medium text-sm">{stats.cold}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contacts table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Contacts ({campaign._count.contacts})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortLink field="name" currentSort={sort} currentOrder={order} id={id}>
                      Nom
                    </SortLink>
                  </TableHead>
                  <TableHead>
                    <SortLink field="phone" currentSort={sort} currentOrder={order} id={id}>
                      Telephone
                    </SortLink>
                  </TableHead>
                  <TableHead>
                    <SortLink field="email" currentSort={sort} currentOrder={order} id={id}>
                      Email
                    </SortLink>
                  </TableHead>
                  <TableHead>Statut appel</TableHead>
                  <TableHead>
                    <SortLink field="score" currentSort={sort} currentOrder={order} id={id}>
                      Score
                    </SortLink>
                  </TableHead>
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
                      Aucun contact. Importez des contacts pour lancer la
                      campagne.
                    </TableCell>
                  </TableRow>
                ) : (
                  campaign.contacts.map((contact) => {
                    const lastCall = contact.calls[0];
                    const callStatus = lastCall
                      ? callStatusLabels[lastCall.status] ??
                        callStatusLabels.pending
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
                          <ScoreBadge
                            label={contact.scoreLabel}
                            score={contact.score}
                          />
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

        {/* Workflows */}
        <WorkflowEditor
          campaignId={campaign.id}
          initialWorkflows={
            (campaign.workflows as unknown as WorkflowRule[]) || []
          }
        />
      </div>
    </div>
  );
}

function SortLink({
  field,
  currentSort,
  currentOrder,
  id,
  children,
}: {
  field: string;
  currentSort: string;
  currentOrder: string;
  id: string;
  children: React.ReactNode;
}) {
  const isActive = currentSort === field;
  const nextOrder = isActive && currentOrder === "desc" ? "asc" : "desc";
  const arrow = isActive ? (currentOrder === "desc" ? " ↓" : " ↑") : "";

  return (
    <a
      href={`/campaigns/${id}?sort=${field}&order=${nextOrder}`}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {children}
      {arrow && <span className="text-xs">{arrow}</span>}
    </a>
  );
}
