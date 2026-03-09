"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateCampaignWorkflows } from "@/app/(dashboard)/campaigns/workflow-actions";
import type { WorkflowRule } from "@/lib/workflows";
import { Plus, Trash2, Save, Zap, Power, PowerOff } from "lucide-react";

const TRIGGER_OPTIONS: { value: WorkflowRule["trigger"]; label: string }[] = [
  { value: "call_completed", label: "Appel termine" },
  { value: "lead_hot", label: "Lead chaud" },
  { value: "lead_warm", label: "Lead tiede" },
  { value: "lead_cold", label: "Lead froid" },
  { value: "no_answer", label: "Pas de reponse" },
  { value: "callback_requested", label: "Rappel demande" },
];

const ACTION_OPTIONS: { value: WorkflowRule["action"]; label: string }[] = [
  { value: "email_notification", label: "Notification email" },
  { value: "tag_contact", label: "Tag contact" },
  { value: "exclude_contact", label: "Exclure contact" },
  { value: "schedule_callback", label: "Programmer rappel" },
];

function generateId() {
  return `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyRule(): WorkflowRule {
  return {
    id: generateId(),
    name: "",
    trigger: "call_completed",
    action: "email_notification",
    config: {},
    enabled: true,
  };
}

export function WorkflowEditor({
  campaignId,
  initialWorkflows,
}: {
  campaignId: string;
  initialWorkflows: WorkflowRule[];
}) {
  const [rules, setRules] = useState<WorkflowRule[]>(initialWorkflows);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function addRule() {
    setRules([...rules, createEmptyRule()]);
    setSaved(false);
  }

  function removeRule(id: string) {
    setRules(rules.filter((r) => r.id !== id));
    setSaved(false);
  }

  function updateRule(id: string, updates: Partial<WorkflowRule>) {
    setRules(
      rules.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
    setSaved(false);
  }

  function toggleRule(id: string) {
    setRules(
      rules.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      )
    );
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await updateCampaignWorkflows(campaignId, rules);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-violet-500" />
            <CardTitle className="text-base">
              Workflows post-appel
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs text-emerald-600">
                Sauvegarde effectuee
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={addRule}
            >
              <Plus className="h-3.5 w-3.5" data-icon="inline-start" />
              Ajouter une regle
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending}
              className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white border-0 hover:from-indigo-600 hover:to-violet-600"
            >
              <Save className="h-3.5 w-3.5" data-icon="inline-start" />
              {isPending ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Aucun workflow configure. Ajoutez une regle pour automatiser les
            actions post-appel.
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <WorkflowRuleCard
                key={rule.id}
                rule={rule}
                onUpdate={(updates) => updateRule(rule.id, updates)}
                onToggle={() => toggleRule(rule.id)}
                onDelete={() => removeRule(rule.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WorkflowRuleCard({
  rule,
  onUpdate,
  onToggle,
  onDelete,
}: {
  rule: WorkflowRule;
  onUpdate: (updates: Partial<WorkflowRule>) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        rule.enabled
          ? "border-border bg-white"
          : "border-border/50 bg-slate-50 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          {/* Name */}
          <div>
            <Label className="text-xs text-muted-foreground">Nom</Label>
            <Input
              value={rule.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Ex: Notification lead chaud"
              className="mt-1"
            />
          </div>

          {/* Trigger + Action row */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">
                Declencheur
              </Label>
              <select
                value={rule.trigger}
                onChange={(e) =>
                  onUpdate({
                    trigger: e.target.value as WorkflowRule["trigger"],
                  })
                }
                className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {TRIGGER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Action</Label>
              <select
                value={rule.action}
                onChange={(e) =>
                  onUpdate({
                    action: e.target.value as WorkflowRule["action"],
                    config: {},
                  })
                }
                className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Config fields based on action */}
          <ActionConfigFields
            action={rule.action}
            config={rule.config}
            onUpdate={(config) => onUpdate({ config })}
          />
        </div>

        {/* Toggle + Delete */}
        <div className="flex flex-col items-center gap-2 pt-5">
          <button
            type="button"
            onClick={onToggle}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-colors"
            title={rule.enabled ? "Desactiver" : "Activer"}
          >
            {rule.enabled ? (
              <Power className="h-4 w-4 text-emerald-500" />
            ) : (
              <PowerOff className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionConfigFields({
  action,
  config,
  onUpdate,
}: {
  action: WorkflowRule["action"];
  config: WorkflowRule["config"];
  onUpdate: (config: WorkflowRule["config"]) => void;
}) {
  switch (action) {
    case "email_notification":
      return (
        <div>
          <Label className="text-xs text-muted-foreground">
            Email de notification
          </Label>
          <Input
            type="email"
            value={config.email || ""}
            onChange={(e) => onUpdate({ ...config, email: e.target.value })}
            placeholder="email@exemple.com"
            className="mt-1"
          />
        </div>
      );
    case "tag_contact":
      return (
        <div>
          <Label className="text-xs text-muted-foreground">Nom du tag</Label>
          <Input
            value={config.tag || ""}
            onChange={(e) => onUpdate({ ...config, tag: e.target.value })}
            placeholder="Ex: interessé, a-rappeler"
            className="mt-1"
          />
        </div>
      );
    case "schedule_callback":
      return (
        <div>
          <Label className="text-xs text-muted-foreground">
            Delai avant rappel (heures)
          </Label>
          <Input
            type="number"
            min={1}
            value={config.callbackDelay || 24}
            onChange={(e) =>
              onUpdate({
                ...config,
                callbackDelay: parseInt(e.target.value) || 24,
              })
            }
            className="mt-1 w-32"
          />
        </div>
      );
    case "exclude_contact":
      return (
        <p className="text-xs text-muted-foreground">
          Le contact sera marque comme exclu et ne sera plus appele.
        </p>
      );
    case "sms_followup":
      return (
        <div>
          <Label className="text-xs text-muted-foreground">
            Message SMS
          </Label>
          <Input
            value={config.smsMessage || ""}
            onChange={(e) =>
              onUpdate({ ...config, smsMessage: e.target.value })
            }
            placeholder="Votre message SMS de suivi..."
            className="mt-1"
          />
        </div>
      );
    default:
      return null;
  }
}
