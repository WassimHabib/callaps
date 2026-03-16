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
} from "@/components/ui/dialog";
import {
  Workflow,
  GitBranch,
  MessageSquare,
  Calendar,
  Sheet,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Unplug,
  Play,
  RefreshCw,
  Stethoscope,
  Copy,
  Check,
} from "lucide-react";
import {
  connectIntegration,
  disconnectIntegration,
  testIntegration,
  syncContacts,
} from "./actions";

interface IntegrationField {
  name: string;
  label: string;
  type: string;
  placeholder: string;
}

interface IntegrationDef {
  type: string;
  name: string;
  description: string;
  icon: string;
  gradient: string;
  shadow: string;
  fields: IntegrationField[];
  features: string[];
  comingSoon?: boolean;
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    type: "doctolib",
    name: "Doctolib",
    description:
      "Consultez les disponibilites praticiens et gerez les RDV medicaux",
    icon: "doctolib",
    gradient: "from-blue-600 to-blue-400",
    shadow: "shadow-blue-500/20",
    fields: [
      {
        name: "slug",
        label: "Slug du praticien Doctolib",
        type: "text",
        placeholder: "dr-martin-dupont",
      },
    ],
    features: ["Disponibilites", "Motifs consultation", "RDV patients"],
  },
  {
    type: "hubspot",
    name: "HubSpot",
    description:
      "Synchronisez vos contacts et activites d'appels avec HubSpot CRM",
    icon: "hubspot",
    gradient: "from-orange-500 to-red-400",
    shadow: "shadow-orange-500/20",
    fields: [
      {
        name: "accessToken",
        label: "Access Token (Private App)",
        type: "password",
        placeholder: "pat-xxx-xxxxxxxx-xxxx",
      },
    ],
    features: ["Sync contacts", "Push appels", "Notes automatiques"],
  },
  {
    type: "pipedrive",
    name: "Pipedrive",
    description:
      "Connectez votre pipeline commercial et synchronisez vos contacts",
    icon: "pipedrive",
    gradient: "from-emerald-500 to-green-400",
    shadow: "shadow-emerald-500/20",
    fields: [
      {
        name: "apiToken",
        label: "API Token",
        type: "password",
        placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      },
      {
        name: "domain",
        label: "Sous-domaine Pipedrive",
        type: "text",
        placeholder: "votre-entreprise",
      },
    ],
    features: ["Sync contacts", "Activites d'appels", "Pipeline"],
  },
  {
    type: "slack",
    name: "Slack",
    description:
      "Recevez des notifications en temps reel sur vos appels et leads",
    icon: "slack",
    gradient: "from-purple-500 to-pink-400",
    shadow: "shadow-purple-500/20",
    fields: [
      {
        name: "webhookUrl",
        label: "URL du Webhook Incoming",
        type: "url",
        placeholder: "https://hooks.slack.com/services/T.../B.../xxx",
      },
    ],
    features: ["Notifications appels", "Alertes leads", "Resume campagnes"],
  },
  {
    type: "google_calendar",
    name: "Google Calendar",
    description: "Synchronisez les rendez-vous pris par vos agents IA",
    icon: "google_calendar",
    gradient: "from-blue-500 to-cyan-400",
    shadow: "shadow-blue-500/20",
    fields: [],
    features: ["Sync RDV", "Rappels automatiques"],
    comingSoon: true,
  },
  {
    type: "google_sheets",
    name: "Google Sheets",
    description:
      "Exportez vos contacts et donnees d'appels vers Google Sheets",
    icon: "google_sheets",
    gradient: "from-green-500 to-emerald-400",
    shadow: "shadow-green-500/20",
    fields: [],
    features: ["Export contacts", "Export appels", "Rapports"],
    comingSoon: true,
  },
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  doctolib: Stethoscope,
  hubspot: Workflow,
  pipedrive: GitBranch,
  slack: MessageSquare,
  google_calendar: Calendar,
  google_sheets: Sheet,
};

const CRM_TYPES = ["hubspot", "pipedrive"];

export function IntegrationCards({
  connectedIntegrations,
  canManage,
}: {
  connectedIntegrations: Array<{ id: string; type: string; enabled: boolean }>;
  canManage: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] =
    useState<IntegrationDef | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<{
    type: string;
    success: boolean;
    message: string;
  } | null>(null);
  const [connected, setConnected] = useState(connectedIntegrations);
  const [copiedUrl, setCopiedUrl] = useState(false);

  function openConfigDialog(integration: IntegrationDef) {
    setSelectedIntegration(integration);
    setFormValues({});
    setActionResult(null);
    setDialogOpen(true);
  }

  function handleFieldChange(fieldName: string, value: string) {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
  }

  function handleConnect() {
    if (!selectedIntegration) return;

    // Validate required fields
    for (const field of selectedIntegration.fields) {
      if (!formValues[field.name]?.trim()) {
        setActionResult({
          type: selectedIntegration.type,
          success: false,
          message: `${field.label} est requis`,
        });
        return;
      }
    }

    startTransition(async () => {
      const result = await connectIntegration(
        selectedIntegration!.type,
        formValues
      );
      setActionResult({
        type: selectedIntegration!.type,
        ...result,
      });
      if (result.success) {
        setConnected((prev) => {
          const exists = prev.some(
            (c) => c.type === selectedIntegration!.type
          );
          if (exists) {
            return prev.map((c) =>
              c.type === selectedIntegration!.type
                ? { ...c, enabled: true }
                : c
            );
          }
          return [...prev, { id: result.integrationId || "", type: selectedIntegration!.type, enabled: true }];
        });
        setTimeout(() => setDialogOpen(false), 1500);
      }
    });
  }

  function handleDisconnect(type: string) {
    if (!confirm("Deconnecter cette integration ?")) return;

    startTransition(async () => {
      const result = await disconnectIntegration(type);
      setActionResult({ type, ...result });
      if (result.success) {
        setConnected((prev) => prev.filter((c) => c.type !== type));
        setTimeout(() => setActionResult(null), 3000);
      }
    });
  }

  function handleTest(type: string) {
    startTransition(async () => {
      const result = await testIntegration(type);
      setActionResult({ type, ...result });
      setTimeout(() => setActionResult(null), 5000);
    });
  }

  function handleSync(type: string) {
    startTransition(async () => {
      const result = await syncContacts(type);
      setActionResult({ type, ...result });
      setTimeout(() => setActionResult(null), 5000);
    });
  }

  function isConnected(type: string): boolean {
    return connected.some((c) => c.type === type && c.enabled);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Integrations
        </h2>
        <p className="text-sm text-slate-500">
          Connectez vos outils et CRM pour synchroniser vos donnees
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((integration) => {
          const Icon = ICON_MAP[integration.icon] || Workflow;
          const integrationConnected = isConnected(integration.type);
          const isCRM = CRM_TYPES.includes(integration.type);
          const result =
            actionResult?.type === integration.type ? actionResult : null;

          return (
            <Card
              key={integration.type}
              className="group border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${integration.gradient} shadow-lg ${integration.shadow}`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {integration.name}
                      </h3>
                    </div>
                  </div>
                  {integrationConnected ? (
                    <Badge className="rounded-lg border-0 bg-emerald-50 text-[11px] font-medium text-emerald-600">
                      Connecte
                    </Badge>
                  ) : integration.comingSoon ? (
                    <Badge className="rounded-lg border-0 bg-slate-100 text-[11px] font-medium text-slate-500">
                      Bientot
                    </Badge>
                  ) : null}
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  {integration.description}
                </p>

                {/* Features badges */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {integration.features.map((feature) => (
                    <Badge
                      key={feature}
                      className="rounded-md border-0 bg-slate-100 text-[10px] font-medium text-slate-600"
                    >
                      {feature}
                    </Badge>
                  ))}
                </div>

                {/* Slack Slash Command URL */}
                {integration.type === "slack" && integrationConnected && (() => {
                  const slackIntegration = connected.find((c) => c.type === "slack");
                  if (!slackIntegration) return null;
                  const commandUrl = `${window.location.origin}/api/slack/commands?token=${slackIntegration.id}`;
                  return (
                    <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50 p-3">
                      <p className="text-[11px] font-semibold text-purple-700 mb-1">
                        Slash Command — URL a configurer dans Slack
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded bg-white px-2 py-1 text-[11px] text-purple-900 border border-purple-100 truncate">
                          {commandUrl}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(commandUrl);
                            setCopiedUrl(true);
                            setTimeout(() => setCopiedUrl(false), 2000);
                          }}
                          className="shrink-0 rounded-md bg-white p-1.5 border border-purple-200 text-purple-600 hover:bg-purple-100 transition-colors"
                          title="Copier l'URL"
                        >
                          {copiedUrl ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-purple-500 mt-1.5">
                        Usage : <code>/appel +33612345678 [NomAgent]</code>
                      </p>
                    </div>
                  );
                })()}

                {/* Action result feedback */}
                {result && (
                  <div
                    className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] ${
                      result.success
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate">{result.message}</span>
                  </div>
                )}

                {/* Action buttons */}
                {canManage && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {integrationConnected ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTest(integration.type)}
                          disabled={isPending}
                          className="rounded-lg border-slate-200 text-[13px]"
                        >
                          {isPending &&
                          actionResult?.type === integration.type ? (
                            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                          ) : (
                            <Play className="mr-1.5 h-3 w-3" />
                          )}
                          Tester
                        </Button>
                        {isCRM && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSync(integration.type)}
                            disabled={isPending}
                            className="rounded-lg border-slate-200 text-[13px]"
                          >
                            {isPending &&
                            actionResult?.type === integration.type ? (
                              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-1.5 h-3 w-3" />
                            )}
                            Sync contacts
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(integration.type)}
                          disabled={isPending}
                          className="rounded-lg border-red-200 text-[13px] text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Unplug className="mr-1.5 h-3 w-3" />
                          Deconnecter
                        </Button>
                      </>
                    ) : !integration.comingSoon ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openConfigDialog(integration)}
                        className="rounded-lg border-slate-200"
                      >
                        <Plus className="mr-2 h-3 w-3" />
                        Configurer
                      </Button>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connection Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedIntegration(null);
            setFormValues({});
            setActionResult(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          {selectedIntegration && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Connecter {selectedIntegration.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedIntegration.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {selectedIntegration.fields.map((field) => (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={`field-${field.name}`}>
                      {field.label}
                    </Label>
                    <Input
                      id={`field-${field.name}`}
                      type={field.type}
                      placeholder={field.placeholder}
                      value={formValues[field.name] || ""}
                      onChange={(e) =>
                        handleFieldChange(field.name, e.target.value)
                      }
                    />
                  </div>
                ))}

                {actionResult && (
                  <div
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] ${
                      actionResult.success
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {actionResult.success ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>{actionResult.message}</span>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  onClick={handleConnect}
                  disabled={isPending}
                  className="rounded-lg"
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Tester et connecter
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
