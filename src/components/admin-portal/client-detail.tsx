"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  updateAdminClient,
  updateClientInfo,
  deleteAdminClient,
  shareClientAccess,
  removeClientShare,
} from "@/app/(dashboard)/admin-portal/clients/actions";
import { startAdminImpersonation } from "@/app/(dashboard)/admin-portal/impersonation-actions";
function formatCentimes(centimes: number): string {
  const euros = (centimes / 100).toFixed(2).replace(".", ",");
  return `${euros} €`;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  onboarding: { label: "Onboarding", className: "bg-blue-50 text-blue-700" },
  active: { label: "Actif", className: "bg-emerald-50 text-emerald-700" },
  suspended: { label: "Suspendu", className: "bg-amber-50 text-amber-700" },
  churned: { label: "Perdu", className: "bg-red-50 text-red-700" },
};

interface ClientDetailProps {
  adminClient: {
    id: string;
    adminId: string;
    clientId: string;
    clientOrgId: string;
    status: string;
    contractStatus: string;
    contractUrl: string | null;
    paymentStatus: string;
    paymentMethod: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    currentPermission: "owner" | "manage" | "read" | null;
    client: {
      id: string;
      name: string;
      email: string;
      company: string | null;
      phone: string | null;
      clerkId: string;
      role: string;
      approved: boolean;
      createdAt: Date;
      updatedAt: Date;
    };
    admin: { id: string; name: string; email: string };
    shares: Array<{
      id: string;
      permission: string;
      sharedWith: { id: string; name: string; email: string };
    }>;
  };
  subscription: {
    monthlyPrice: number;
    status: string;
    pricePerMinute: number;
  } | null;
  invoicesSummary: {
    total: number;
    paid: number;
    overdue: number;
    totalAmount: number;
  };
  clientStats: { agents: number; campaigns: number; calls: number };
}

export function ClientDetail({
  adminClient,
  subscription,
  invoicesSummary,
  clientStats,
}: ClientDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [status, setStatus] = useState(adminClient.status);
  const [contractStatus, setContractStatus] = useState(
    adminClient.contractStatus
  );
  const [contractUrl, setContractUrl] = useState(
    adminClient.contractUrl ?? ""
  );
  const [paymentStatus, setPaymentStatus] = useState(
    adminClient.paymentStatus
  );
  const [paymentMethod, setPaymentMethod] = useState(
    adminClient.paymentMethod ?? ""
  );
  const [notes, setNotes] = useState(adminClient.notes ?? "");

  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState("read");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { client } = adminClient;
  const currentStatus = statusConfig[status] ?? {
    label: status,
    className: "bg-gray-50 text-gray-700",
  };

  async function handleSaveStatus() {
    setError(null);
    setSuccessMessage(null);
    startTransition(async () => {
      try {
        await updateAdminClient(adminClient.clientId, {
          status,
          contractStatus,
          contractUrl: contractUrl || undefined,
          paymentStatus,
          paymentMethod: paymentMethod || undefined,
        });
        setSuccessMessage("Informations mises à jour.");
        router.refresh();
      } catch {
        setError("Erreur lors de la mise à jour.");
      }
    });
  }

  async function handleSaveNotes() {
    setError(null);
    startTransition(async () => {
      try {
        await updateAdminClient(adminClient.clientId, { notes: notes || undefined });
        setSuccessMessage("Notes enregistrées.");
        router.refresh();
      } catch {
        setError("Erreur lors de la sauvegarde des notes.");
      }
    });
  }

  async function handleShare() {
    setShareError(null);
    startTransition(async () => {
      try {
        await shareClientAccess(adminClient.clientId, shareEmail, sharePermission as "read" | "manage");
        setShareEmail("");
        setSharePermission("read");
        setShareDialogOpen(false);
        router.refresh();
      } catch {
        setShareError("Erreur lors du partage.");
      }
    });
  }

  async function handleRemoveShare(shareId: string) {
    startTransition(async () => {
      try {
        await removeClientShare(shareId);
        router.refresh();
      } catch {
        setError("Erreur lors de la suppression du partage.");
      }
    });
  }

  async function handleDelete() {
    startTransition(async () => {
      try {
        await deleteAdminClient(adminClient.clientId);
        router.push("/admin-portal/clients");
      } catch {
        setError("Erreur lors de la suppression.");
        setDeleteDialogOpen(false);
      }
    });
  }

  async function handleImpersonate() {
    startTransition(async () => {
      try {
        await startAdminImpersonation(adminClient.clientOrgId);
      } catch {
        setError("Erreur lors de l'accès à l'espace client.");
      }
    });
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{client.name}</h2>
            <Badge className={currentStatus.className}>
              {currentStatus.label}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {client.company && <span>{client.company} &middot; </span>}
            {client.email}
            {client.phone && <span> &middot; {client.phone}</span>}
          </p>
        </div>
        <Button onClick={handleImpersonate} disabled={isPending}>
          Accéder à l&apos;espace
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {successMessage && (
        <p className="text-sm text-emerald-600">{successMessage}</p>
      )}

      {/* Section 1 — Status & Contract */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="text-lg font-semibold">Statut & Contrat</h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="suspended">Suspendu</SelectItem>
                  <SelectItem value="churned">Perdu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Statut du contrat</Label>
              <Select value={contractStatus} onValueChange={(v) => v && setContractStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="sent">Envoyé</SelectItem>
                  <SelectItem value="signed">Signé</SelectItem>
                  <SelectItem value="expired">Expiré</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>URL du contrat</Label>
              <Input
                value={contractUrl}
                onChange={(e) => setContractUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label>Statut du paiement</Label>
              <Select value={paymentStatus} onValueChange={(v) => v && setPaymentStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="authorized">Autorisé</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="failed">Échoué</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Moyen de paiement</Label>
              <Input
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="CB, virement..."
              />
            </div>
          </div>

          <Button onClick={handleSaveStatus} disabled={isPending}>
            Enregistrer
          </Button>
        </CardContent>
      </Card>

      {/* Section 2 — Subscription */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="text-lg font-semibold">Abonnement</h3>
          {subscription ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <p className="text-muted-foreground text-sm">Prix mensuel</p>
                <p className="text-lg font-medium">
                  {formatCentimes(subscription.monthlyPrice)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Prix par minute</p>
                <p className="text-lg font-medium">
                  {formatCentimes(subscription.pricePerMinute)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Statut</p>
                <p className="text-lg font-medium">{subscription.status}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Aucun abonnement</p>
          )}
        </CardContent>
      </Card>

      {/* Section 3 — Activity stats */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="text-lg font-semibold">Activité</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div>
              <p className="text-muted-foreground text-sm">Agents</p>
              <p className="text-2xl font-bold">{clientStats.agents}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Campagnes</p>
              <p className="text-2xl font-bold">{clientStats.campaigns}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Appels</p>
              <p className="text-2xl font-bold">{clientStats.calls}</p>
            </div>
          </div>

          <h4 className="text-md mt-4 font-semibold">Factures</h4>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-muted-foreground text-sm">Total</p>
              <p className="text-lg font-medium">{invoicesSummary.total}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Payées</p>
              <p className="text-lg font-medium">{invoicesSummary.paid}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">En retard</p>
              <p className="text-lg font-medium">{invoicesSummary.overdue}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Montant total</p>
              <p className="text-lg font-medium">
                {formatCentimes(invoicesSummary.totalAmount)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4 — Notes */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="text-lg font-semibold">Notes</h3>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Notes internes sur ce client..."
          />
          <Button onClick={handleSaveNotes} disabled={isPending}>
            Enregistrer les notes
          </Button>
        </CardContent>
      </Card>

      {/* Section 5 — Shared access */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Accès partagés</h3>
            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
              <DialogTrigger render={<Button variant="outline" size="sm" />}>
                Partager l&apos;accès
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Partager l&apos;accès</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {shareError && (
                    <p className="text-sm text-red-600">{shareError}</p>
                  )}
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      placeholder="admin@exemple.com"
                      type="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Permission</Label>
                    <Select
                      value={sharePermission}
                      onValueChange={(v) => v && setSharePermission(v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="read">Lecture</SelectItem>
                        <SelectItem value="manage">Gestion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleShare}
                    disabled={isPending || !shareEmail}
                    className="w-full"
                  >
                    Partager
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {adminClient.shares.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun accès partagé</p>
          ) : (
            <div className="space-y-2">
              {adminClient.shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{share.sharedWith.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {share.sharedWith.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        share.permission === "manage"
                          ? "bg-purple-50 text-purple-700"
                          : "bg-gray-50 text-gray-700"
                      }
                    >
                      {share.permission === "manage" ? "Gestion" : "Lecture"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveShare(share.id)}
                      disabled={isPending}
                    >
                      Retirer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete */}
      <div className="flex justify-end">
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogTrigger render={<Button variant="destructive" />}>
            Supprimer ce client
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground text-sm">
              Cette action est irréversible. Toutes les données associées à ce
              client seront supprimées.
            </p>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                Supprimer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
