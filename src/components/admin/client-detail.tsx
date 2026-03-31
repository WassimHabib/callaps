"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Bot,
  Megaphone,
  Phone,
  Clock,
  Trash2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Eye,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteClient,
  deleteClientAgent,
  deleteClientCampaign,
  sendClientInvite,
  sendClientReset,
} from "@/app/(dashboard)/admin/actions";

interface Agent {
  id: string;
  name: string;
  published: boolean;
  retellAgentId: string | null;
  language: string;
  voiceId: string;
  llmModel: string;
  createdAt: Date;
  _count: { campaigns: number };
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  scheduledAt: Date | null;
  createdAt: Date;
  agent: { name: string };
  _count: { contacts: number; calls: number };
}

interface ClientData {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  role: string;
  passwordHash: string | null;
  createdAt: Date;
  agents: Agent[];
  campaigns: Campaign[];
}

interface CallStats {
  total: number;
  completed: number;
  failed: number;
  totalDuration: number;
}

export function AdminClientDetail({
  client,
  callStats,
}: {
  client: ClientData;
  callStats: CallStats;
}) {
  const [isPending, startTransition] = useTransition();
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "client" | "agent" | "campaign";
    id: string;
    name: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"agents" | "campaigns">("agents");
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSendAccessEmail = () => {
    setError(null);
    setEmailSent(false);
    startTransition(async () => {
      try {
        if (client.passwordHash) {
          await sendClientReset(client.id);
        } else {
          await sendClientInvite(client.id);
        }
        setEmailSent(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur lors de l'envoi de l'email.");
      }
    });
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    startTransition(async () => {
      if (deleteConfirm.type === "client") {
        await deleteClient(deleteConfirm.id);
      } else if (deleteConfirm.type === "agent") {
        await deleteClientAgent(deleteConfirm.id);
        router.refresh();
      } else if (deleteConfirm.type === "campaign") {
        await deleteClientCampaign(deleteConfirm.id);
        router.refresh();
      }
      setDeleteConfirm(null);
    });
  };

  const formatDuration = (seconds: number) => {
    if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    if (seconds >= 60) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const statusLabel: Record<string, { label: string; color: string }> = {
    draft: { label: "Brouillon", color: "bg-slate-100 text-slate-600" },
    scheduled: { label: "Planifiée", color: "bg-blue-50 text-blue-600" },
    running: { label: "En cours", color: "bg-green-50 text-green-600" },
    paused: { label: "En pause", color: "bg-amber-50 text-amber-600" },
    completed: { label: "Terminée", color: "bg-emerald-50 text-emerald-600" },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <Link href="/admin/clients">
          <Button variant="outline" size="sm" className="rounded-lg text-xs">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Retour aux clients
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg text-xs"
            onClick={handleSendAccessEmail}
            disabled={isPending}
          >
            {client.passwordHash ? "Envoyer reset mot de passe" : "Renvoyer l'invitation"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() =>
              setDeleteConfirm({
                type: "client",
                id: client.id,
                name: client.name,
              })
            }
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Supprimer le client
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {emailSent && <p className="text-sm text-emerald-600">Email envoyé a {client.email}</p>}

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                <Bot className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{client.agents.length}</p>
                <p className="text-xs text-slate-500">Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <Megaphone className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{client.campaigns.length}</p>
                <p className="text-xs text-slate-500">Campagnes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <Phone className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{callStats.total}</p>
                <p className="text-xs text-slate-500">
                  Appels ({callStats.completed} OK / {callStats.failed} KO)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {formatDuration(callStats.totalDuration)}
                </p>
                <p className="text-xs text-slate-500">Durée totale</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client info */}
      <Card className="border-0 bg-white shadow-sm">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Informations</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400">Nom</p>
              <p className="font-medium text-slate-900">{client.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Email</p>
              <p className="font-medium text-slate-900">{client.email}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Entreprise</p>
              <p className="font-medium text-slate-900">{client.company || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Téléphone</p>
              <p className="font-medium text-slate-900">{client.phone || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Inscription</p>
              <p className="font-medium text-slate-900">
                {new Date(client.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Rôle</p>
              <Badge className="border-0 bg-slate-100 text-slate-600 text-xs mt-0.5">
                {client.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("agents")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "agents"
              ? "border-indigo-500 text-indigo-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Bot className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          Agents ({client.agents.length})
        </button>
        <button
          onClick={() => setActiveTab("campaigns")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "campaigns"
              ? "border-indigo-500 text-indigo-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Megaphone className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          Campagnes ({client.campaigns.length})
        </button>
      </div>

      {/* Agents tab */}
      {activeTab === "agents" && (
        <Card className="border-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-500">Agent</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500">Modèle</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500">Voix</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500">Langue</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 text-center">Statut</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 text-center">Campagnes</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.agents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-slate-400">
                    Aucun agent créé
                  </TableCell>
                </TableRow>
              ) : (
                client.agents.map((agent) => (
                  <TableRow key={agent.id} className="group">
                    <TableCell>
                      <p className="text-sm font-medium text-slate-900">{agent.name}</p>
                      <p className="text-[10px] font-mono text-slate-400">{agent.id.slice(0, 12)}...</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">{agent.llmModel}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">{agent.voiceId}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">{agent.language}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {agent.published ? (
                        <Badge className="border-0 bg-emerald-50 text-emerald-600 text-[10px]">
                          <CheckCircle className="h-3 w-3 mr-0.5" />
                          Publié
                        </Badge>
                      ) : (
                        <Badge className="border-0 bg-slate-100 text-slate-500 text-[10px]">
                          Brouillon
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="border-0 bg-slate-100 text-slate-600 text-xs">
                        {agent._count.campaigns}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/agents/${agent.id}`}>
                          <Button variant="outline" size="sm" className="h-7 rounded-md text-[11px] px-2">
                            <Eye className="h-3 w-3 mr-1" />
                            Voir
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 rounded-md text-[11px] px-2 text-red-600 hover:bg-red-50"
                          onClick={() =>
                            setDeleteConfirm({ type: "agent", id: agent.id, name: agent.name })
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Campaigns tab */}
      {activeTab === "campaigns" && (
        <Card className="border-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-500">Campagne</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500">Agent</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 text-center">Statut</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 text-center">Contacts</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 text-center">Appels</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500">Créée le</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-slate-400">
                    Aucune campagne créée
                  </TableCell>
                </TableRow>
              ) : (
                client.campaigns.map((campaign) => {
                  const st = statusLabel[campaign.status] || statusLabel.draft;
                  return (
                    <TableRow key={campaign.id} className="group">
                      <TableCell>
                        <p className="text-sm font-medium text-slate-900">{campaign.name}</p>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-600">{campaign.agent.name}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`border-0 text-[10px] ${st.color}`}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="border-0 bg-slate-100 text-slate-600 text-xs">
                          {campaign._count.contacts}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="border-0 bg-slate-100 text-slate-600 text-xs">
                          {campaign._count.calls}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-400">
                          {new Date(campaign.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/campaigns/${campaign.id}`}>
                            <Button variant="outline" size="sm" className="h-7 rounded-md text-[11px] px-2">
                              <Eye className="h-3 w-3 mr-1" />
                              Voir
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 rounded-md text-[11px] px-2 text-red-600 hover:bg-red-50"
                            onClick={() =>
                              setDeleteConfirm({ type: "campaign", id: campaign.id, name: campaign.name })
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              {deleteConfirm?.type === "client" && (
                <>
                  Supprimer le client <strong>{deleteConfirm.name}</strong> et toutes ses données
                  (agents, campagnes, contacts, appels) ? Cette action est irréversible.
                </>
              )}
              {deleteConfirm?.type === "agent" && (
                <>
                  Supprimer l&apos;agent <strong>{deleteConfirm.name}</strong> ? Il sera aussi
                  supprimé de Retell.
                </>
              )}
              {deleteConfirm?.type === "campaign" && (
                <>
                  Supprimer la campagne <strong>{deleteConfirm.name}</strong> et tous ses contacts
                  et appels associés ?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isPending ? (
                <>
                  <span className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Supprimer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
