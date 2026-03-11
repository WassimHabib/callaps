"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Play,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  createWebhook,
  deleteWebhook,
  toggleWebhook,
  testWebhook,
  fetchWebhookLogs,
} from "./webhook-actions";
import type { WebhookEvent } from "@/lib/webhook-delivery";

const WEBHOOK_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: "call_ended", label: "Appel terminé" },
  { value: "call_analyzed", label: "Appel analysé" },
  { value: "lead_hot", label: "Lead chaud" },
  { value: "lead_warm", label: "Lead tiède" },
  { value: "lead_cold", label: "Lead froid" },
  { value: "campaign_completed", label: "Campagne terminée" },
];

interface WebhookWithLastDelivery {
  id: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  enabled: boolean;
  userId: string;
  orgId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastDelivery: {
    webhookId: string;
    success: boolean;
    statusCode: number | null;
    createdAt: Date;
  } | null;
}

interface WebhookLog {
  id: string;
  webhookId: string;
  event: string;
  payload: unknown;
  statusCode: number | null;
  response: string | null;
  success: boolean;
  createdAt: Date;
}

export function WebhooksSection({
  initialWebhooks,
  canManage,
}: {
  initialWebhooks: WebhookWithLastDelivery[];
  canManage: boolean;
}) {
  const [webhooks, setWebhooks] = useState(initialWebhooks);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, WebhookLog[]>>({});
  const [isPending, startTransition] = useTransition();
  const [testResult, setTestResult] = useState<{
    id: string;
    success: boolean;
    statusCode: number | null;
  } | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formSecret, setFormSecret] = useState("");
  const [formEvents, setFormEvents] = useState<WebhookEvent[]>([]);
  const [formError, setFormError] = useState("");

  function resetForm() {
    setFormName("");
    setFormUrl("");
    setFormSecret("");
    setFormEvents([]);
    setFormError("");
  }

  function toggleEvent(event: WebhookEvent) {
    setFormEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  function handleCreate() {
    if (!formName.trim()) {
      setFormError("Le nom est requis");
      return;
    }
    if (!formUrl.trim()) {
      setFormError("L'URL est requise");
      return;
    }
    if (formEvents.length === 0) {
      setFormError("Sélectionnez au moins un événement");
      return;
    }

    startTransition(async () => {
      try {
        await createWebhook({
          name: formName.trim(),
          url: formUrl.trim(),
          secret: formSecret.trim() || undefined,
          events: formEvents,
        });
        setDialogOpen(false);
        resetForm();
        // Reload page to get fresh data
        window.location.reload();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Erreur lors de la création");
      }
    });
  }

  function handleToggle(id: string) {
    startTransition(async () => {
      await toggleWebhook(id);
      setWebhooks((prev) =>
        prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
      );
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Supprimer ce webhook ?")) return;
    startTransition(async () => {
      await deleteWebhook(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    });
  }

  function handleTest(id: string) {
    setTestResult(null);
    startTransition(async () => {
      const result = await testWebhook(id);
      setTestResult({ id, success: result.success, statusCode: result.statusCode });
      setTimeout(() => setTestResult(null), 5000);
    });
  }

  function handleToggleLogs(webhookId: string) {
    if (expandedLogs === webhookId) {
      setExpandedLogs(null);
      return;
    }
    setExpandedLogs(webhookId);
    if (!logs[webhookId]) {
      startTransition(async () => {
        const data = await fetchWebhookLogs(webhookId);
        setLogs((prev) => ({ ...prev, [webhookId]: data }));
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Webhooks</h2>
          <p className="text-sm text-slate-500">
            Recevez les événements en temps réel sur votre serveur
          </p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger>
              <Button size="sm" className="rounded-lg">
                <Plus className="mr-2 h-3.5 w-3.5" />
                Ajouter un webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nouveau webhook</DialogTitle>
                <DialogDescription>
                  Configurez un endpoint pour recevoir les événements
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="webhook-name">Nom</Label>
                  <Input
                    id="webhook-name"
                    placeholder="Mon webhook"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">URL</Label>
                  <Input
                    id="webhook-url"
                    placeholder="https://example.com/webhook"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook-secret">
                    Secret <span className="text-slate-400">(optionnel)</span>
                  </Label>
                  <Input
                    id="webhook-secret"
                    placeholder="Clé secrète pour la signature HMAC"
                    value={formSecret}
                    onChange={(e) => setFormSecret(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Événements</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {WEBHOOK_EVENTS.map((evt) => (
                      <button
                        key={evt.value}
                        type="button"
                        onClick={() => toggleEvent(evt.value)}
                        className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                          formEvents.includes(evt.value)
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {evt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {formError && (
                  <p className="text-sm text-red-500">{formError}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreate}
                  disabled={isPending}
                  className="rounded-lg"
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Créer le webhook
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {webhooks.length === 0 ? (
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-slate-500">
              Aucun webhook configuré. Ajoutez-en un pour recevoir les événements.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <Card key={webhook.id} className="border-0 bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-900 truncate">
                        {webhook.name}
                      </h3>
                      <Badge
                        className={`rounded-md border-0 text-[11px] font-medium ${
                          webhook.enabled
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {webhook.enabled ? "Actif" : "Inactif"}
                      </Badge>
                      {webhook.lastDelivery && (
                        <Badge
                          className={`rounded-md border-0 text-[11px] font-medium ${
                            webhook.lastDelivery.success
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {webhook.lastDelivery.success
                            ? `${webhook.lastDelivery.statusCode}`
                            : `Erreur ${webhook.lastDelivery.statusCode || ""}`}
                        </Badge>
                      )}
                      {testResult?.id === webhook.id && (
                        <Badge
                          className={`rounded-md border-0 text-[11px] font-medium ${
                            testResult.success
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          Test: {testResult.success ? "OK" : `Erreur ${testResult.statusCode || ""}`}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-400 truncate font-mono">
                      {webhook.url}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {webhook.events.map((evt) => (
                        <Badge
                          key={evt}
                          className="rounded-md border-0 bg-slate-100 text-[10px] font-medium text-slate-600"
                        >
                          {WEBHOOK_EVENTS.find((e) => e.value === evt)?.label || evt}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTest(webhook.id)}
                        disabled={isPending}
                        title="Tester"
                        className="h-8 w-8 p-0"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(webhook.id)}
                        disabled={isPending}
                        title={webhook.enabled ? "Désactiver" : "Activer"}
                        className={`h-8 px-2 text-xs ${
                          webhook.enabled ? "text-amber-600" : "text-emerald-600"
                        }`}
                      >
                        {webhook.enabled ? "Désactiver" : "Activer"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(webhook.id)}
                        disabled={isPending}
                        title="Supprimer"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Logs toggle */}
                <button
                  onClick={() => handleToggleLogs(webhook.id)}
                  className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {expandedLogs === webhook.id ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  Historique des livraisons
                </button>

                {/* Logs panel */}
                {expandedLogs === webhook.id && (
                  <div className="mt-2 rounded-lg bg-slate-50 p-3">
                    {!logs[webhook.id] ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      </div>
                    ) : logs[webhook.id].length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-2">
                        Aucune livraison
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        {logs[webhook.id].map((log) => (
                          <div
                            key={log.id}
                            className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs"
                          >
                            {log.success ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            )}
                            <span className="font-medium text-slate-700">
                              {log.event}
                            </span>
                            <Badge
                              className={`rounded border-0 text-[10px] ${
                                log.success
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {log.statusCode || "Erreur"}
                            </Badge>
                            <span className="ml-auto text-slate-400">
                              {new Date(log.createdAt).toLocaleString("fr-FR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
