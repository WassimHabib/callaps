"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProspectStageBar } from "@/components/admin-portal/prospect-stage-bar";
import {
  updateProspect,
  advanceProspectStage,
  markProspectLost,
  addProspectActivity,
  convertProspectToClient,
  deleteProspect,
} from "@/app/(dashboard)/admin-portal/prospects/actions";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const stageConfig: Record<string, { label: string; className: string }> = {
  prospect: { label: "Prospect", className: "bg-slate-50 text-slate-600" },
  contacted: { label: "Contacté", className: "bg-blue-50 text-blue-700" },
  demo_scheduled: { label: "Démo planifiée", className: "bg-indigo-50 text-indigo-700" },
  demo_done: { label: "Démo faite", className: "bg-violet-50 text-violet-700" },
  proposal_sent: { label: "Proposition", className: "bg-amber-50 text-amber-700" },
  negotiation: { label: "Négociation", className: "bg-orange-50 text-orange-700" },
  converted: { label: "Converti", className: "bg-emerald-50 text-emerald-700" },
  lost: { label: "Perdu", className: "bg-red-50 text-red-700" },
};

const activityTypeConfig: Record<string, { label: string; className: string }> = {
  call: { label: "Appel", className: "bg-blue-50 text-blue-700" },
  email: { label: "Email", className: "bg-violet-50 text-violet-700" },
  meeting: { label: "Réunion", className: "bg-amber-50 text-amber-700" },
  note: { label: "Note", className: "bg-slate-50 text-slate-600" },
  stage_change: { label: "Étape", className: "bg-indigo-50 text-indigo-700" },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProspectDetailProps {
  prospect: {
    id: string;
    adminId: string;
    name: string;
    phone: string | null;
    email: string | null;
    company: string | null;
    source: string;
    stage: string;
    lostReason: string | null;
    nextAction: string | null;
    nextActionDate: Date | null;
    estimatedValue: number | null;
    notes: string | null;
    convertedToId: string | null;
    createdAt: Date;
    updatedAt: Date;
    convertedTo: { id: string; name: string; email: string } | null;
    activities: Array<{
      id: string;
      type: string;
      description: string;
      createdAt: Date;
      author: { id: string; name: string };
    }>;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatEuros(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProspectDetail({ prospect }: ProspectDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Editable info fields
  const [info, setInfo] = useState({
    name: prospect.name,
    phone: prospect.phone ?? "",
    email: prospect.email ?? "",
    company: prospect.company ?? "",
    source: prospect.source,
    estimatedValue: prospect.estimatedValue?.toString() ?? "",
  });

  // Next action fields
  const [nextAction, setNextAction] = useState(prospect.nextAction ?? "");
  const [nextActionDate, setNextActionDate] = useState(
    prospect.nextActionDate
      ? new Date(prospect.nextActionDate).toISOString().slice(0, 10)
      : ""
  );

  // Lost reason
  const [lostReason, setLostReason] = useState(prospect.lostReason ?? "");

  // Mark-lost dialog
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [lostDialogReason, setLostDialogReason] = useState("");

  // New activity
  const [activityType, setActivityType] = useState("call");
  const [activityDescription, setActivityDescription] = useState("");

  // Convert dialog
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // ---- Handlers ----------------------------------------------------------

  function handleInfoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInfo((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function saveInfo() {
    setError(null);
    startTransition(async () => {
      try {
        await updateProspect(prospect.id, {
          name: info.name,
          phone: info.phone || undefined,
          email: info.email || undefined,
          company: info.company || undefined,
          source: info.source,
          estimatedValue: info.estimatedValue ? parseFloat(info.estimatedValue) : null,
        });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde.");
      }
    });
  }

  function saveNextAction() {
    setError(null);
    startTransition(async () => {
      try {
        await updateProspect(prospect.id, {
          nextAction: nextAction || undefined,
          nextActionDate: nextActionDate || undefined,
        });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde.");
      }
    });
  }

  function saveLostReason() {
    setError(null);
    startTransition(async () => {
      try {
        await updateProspect(prospect.id, { lostReason: lostReason || undefined });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde.");
      }
    });
  }

  function handleAdvance() {
    setError(null);
    startTransition(async () => {
      try {
        await advanceProspectStage(prospect.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors de l'avancement.");
      }
    });
  }

  function handleMarkLost() {
    setError(null);
    startTransition(async () => {
      try {
        await markProspectLost(prospect.id, lostDialogReason);
        setLostDialogOpen(false);
        setLostDialogReason("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors du marquage.");
      }
    });
  }

  function handleAddActivity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await addProspectActivity(prospect.id, activityType, activityDescription);
        setActivityDescription("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors de l'ajout.");
      }
    });
  }

  function handleConvert() {
    setError(null);
    startTransition(async () => {
      try {
        const newClientId = await convertProspectToClient(prospect.id);
        setConvertDialogOpen(false);
        router.push(`/admin-portal/clients/${newClientId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors de la conversion.");
      }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteProspect(prospect.id);
        setDeleteDialogOpen(false);
        router.push("/admin-portal/prospects");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors de la suppression.");
      }
    });
  }

  // ---- Derived -----------------------------------------------------------

  const stage = stageConfig[prospect.stage] ?? { label: prospect.stage, className: "" };
  const isTerminal = prospect.stage === "converted" || prospect.stage === "lost";
  const canConvert =
    !isTerminal &&
    prospect.stage !== "prospect" &&
    prospect.stage !== "contacted";

  // ---- Render ------------------------------------------------------------

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{prospect.name}</h2>
        {prospect.company && (
          <span className="text-sm text-slate-500">{prospect.company}</span>
        )}
        <Badge className={stage.className}>{stage.label}</Badge>
        <Badge className="bg-slate-50 text-slate-600">{prospect.source}</Badge>
        {prospect.estimatedValue !== null && (
          <span className="text-sm font-medium text-slate-700">
            {formatEuros(prospect.estimatedValue)}
          </span>
        )}
      </div>

      {/* Stage bar */}
      <ProspectStageBar
        currentStage={prospect.stage}
        onAdvance={handleAdvance}
        onMarkLost={() => setLostDialogOpen(true)}
        disabled={isPending}
      />

      {/* Mark-lost dialog */}
      <Dialog open={lostDialogOpen} onOpenChange={setLostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marquer comme perdu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="lost-reason">Raison</Label>
              <Textarea
                id="lost-reason"
                value={lostDialogReason}
                onChange={(e) => setLostDialogReason(e.target.value)}
                placeholder="Raison de la perte..."
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleMarkLost} disabled={isPending} variant="destructive">
                {isPending ? "En cours..." : "Confirmer"}
              </Button>
              <Button variant="outline" onClick={() => setLostDialogOpen(false)} disabled={isPending}>
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Informations */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Informations</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="info-name">Nom</Label>
              <Input
                id="info-name"
                name="name"
                value={info.name}
                onChange={handleInfoChange}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="info-phone">Téléphone</Label>
              <Input
                id="info-phone"
                name="phone"
                value={info.phone}
                onChange={handleInfoChange}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="info-email">Email</Label>
              <Input
                id="info-email"
                name="email"
                type="email"
                value={info.email}
                onChange={handleInfoChange}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="info-company">Entreprise</Label>
              <Input
                id="info-company"
                name="company"
                value={info.company}
                onChange={handleInfoChange}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="info-source">Source</Label>
              <Input
                id="info-source"
                name="source"
                value={info.source}
                onChange={handleInfoChange}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="info-value">Valeur estimée</Label>
              <Input
                id="info-value"
                name="estimatedValue"
                type="number"
                value={info.estimatedValue}
                onChange={handleInfoChange}
                disabled={isPending}
                placeholder="0"
              />
            </div>
          </div>
          <Button size="sm" onClick={saveInfo} disabled={isPending}>
            {isPending ? "Sauvegarde..." : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>

      {/* Prochaine action */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Prochaine action</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="next-action">Action</Label>
              <Input
                id="next-action"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                disabled={isPending}
                placeholder="Ex: Relancer par email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="next-action-date">Date</Label>
              <Input
                id="next-action-date"
                type="date"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
          <Button size="sm" onClick={saveNextAction} disabled={isPending}>
            {isPending ? "Sauvegarde..." : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>

      {/* Raison de perte */}
      {prospect.stage === "lost" && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Raison de perte</h3>
            <div className="space-y-1.5">
              <Textarea
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                disabled={isPending}
                rows={3}
                placeholder="Raison de la perte..."
              />
            </div>
            <Button size="sm" onClick={saveLostReason} disabled={isPending}>
              {isPending ? "Sauvegarde..." : "Enregistrer"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Ajouter une interaction */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Ajouter une interaction</h3>
          <form onSubmit={handleAddActivity} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="activity-type">Type</Label>
                <Select value={activityType} onValueChange={(v) => v && setActivityType(v)}>
                  <SelectTrigger id="activity-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Appel</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Réunion</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activity-desc">Description</Label>
              <Textarea
                id="activity-desc"
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
                disabled={isPending}
                rows={3}
                placeholder="Décrivez l'interaction..."
                required
              />
            </div>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Historique */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Historique</h3>
          {prospect.activities.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune activité enregistrée.</p>
          ) : (
            <div className="space-y-4">
              {[...prospect.activities]
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )
                .map((activity) => {
                  const typeConf = activityTypeConfig[activity.type] ?? {
                    label: activity.type,
                    className: "bg-slate-50 text-slate-600",
                  };
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 border-l-2 border-slate-100 pl-4"
                    >
                      <Badge className={typeConf.className}>{typeConf.label}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700">{activity.description}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {activity.author.name} &middot; {formatDate(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Convert & Delete */}
      <div className="flex gap-3">
        {canConvert && (
          <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
            <DialogTrigger render={<Button className="bg-emerald-600 hover:bg-emerald-700" />}>
              Convertir en client
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmer la conversion</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-slate-600">
                Convertir <strong>{prospect.name}</strong> en client ? Cette action est
                irréversible.
              </p>
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={handleConvert}
                  disabled={isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isPending ? "Conversion..." : "Confirmer"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConvertDialogOpen(false)}
                  disabled={isPending}
                >
                  Annuler
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogTrigger render={<Button variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700" />}>
            Supprimer
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600">
              Supprimer définitivement <strong>{prospect.name}</strong> et tout son
              historique ? Cette action est irréversible.
            </p>
            <div className="flex gap-3 mt-4">
              <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                {isPending ? "Suppression..." : "Supprimer"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isPending}
              >
                Annuler
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
