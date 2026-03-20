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
  Copy,
  Check,
  Eye,
  EyeOff,
  Ban,
  Loader2,
  Key,
} from "lucide-react";
import {
  createApiKeyAction,
  revokeApiKey,
  deleteApiKey,
} from "./apikey-actions";

interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  active: boolean;
  lastUsed: Date | null;
  createdAt: Date;
}

export function ApiKeysSection({
  initialApiKeys,
  canManage,
}: {
  initialApiKeys: ApiKeyItem[];
  canManage: boolean;
}) {
  const [apiKeys, setApiKeys] = useState(initialApiKeys);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formName, setFormName] = useState("");
  const [formError, setFormError] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  function maskKey(key: string) {
    return key.slice(0, 8) + "••••••••••••••••" + key.slice(-4);
  }

  function toggleKeyVisibility(id: string) {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copyToClipboard(key: string, id: string) {
    await navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleCreate() {
    if (!formName.trim()) {
      setFormError("Le nom est requis");
      return;
    }

    startTransition(async () => {
      try {
        const created = await createApiKeyAction(formName.trim());
        setApiKeys((prev) => [created, ...prev]);
        setNewKey(created.key);
        setFormName("");
        setFormError("");
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : "Erreur lors de la création"
        );
      }
    });
  }

  function handleRevoke(id: string) {
    if (!confirm("Révoquer cette clé API ? Elle ne pourra plus être utilisée."))
      return;
    startTransition(async () => {
      await revokeApiKey(id);
      setApiKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, active: false } : k))
      );
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Supprimer définitivement cette clé API ?")) return;
    startTransition(async () => {
      await deleteApiKey(id);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Clés API</h2>
          <p className="text-sm text-slate-500">
            Utilisez vos clés API pour déclencher des appels depuis vos
            applications
          </p>
        </div>
        {canManage && (
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setFormName("");
                setFormError("");
                setNewKey(null);
              }
            }}
          >
            <DialogTrigger>
              <Button size="sm" className="rounded-lg">
                <Plus className="mr-2 h-3.5 w-3.5" />
                Nouvelle clé API
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nouvelle clé API</DialogTitle>
                <DialogDescription>
                  Créez une clé pour intégrer l&apos;API d&apos;appels sortants
                </DialogDescription>
              </DialogHeader>

              {newKey ? (
                <div className="space-y-4 py-2">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-medium text-amber-800">
                      Copiez cette clé maintenant — elle ne sera plus affichée
                      en entier.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-mono text-slate-700 break-all">
                      {newKey}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(newKey, "new")}
                      className="shrink-0"
                    >
                      {copiedId === "new" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => {
                        setDialogOpen(false);
                        setNewKey(null);
                      }}
                      className="rounded-lg"
                    >
                      J&apos;ai copié la clé
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="apikey-name">Nom</Label>
                    <Input
                      id="apikey-name"
                      placeholder="Ex: Site web, CRM, Application mobile"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    />
                  </div>
                  {formError && (
                    <p className="text-sm text-red-500">{formError}</p>
                  )}
                  <DialogFooter>
                    <Button
                      onClick={handleCreate}
                      disabled={isPending}
                      className="rounded-lg"
                    >
                      {isPending ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      Générer la clé
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      {apiKeys.length === 0 ? (
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-8 text-center">
            <Key className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">
              Aucune clé API. Créez-en une pour commencer à utiliser
              l&apos;API.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {apiKeys.map((apiKey) => (
            <Card key={apiKey.id} className="border-0 bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-900">
                        {apiKey.name}
                      </h3>
                      <Badge
                        className={`rounded-md border-0 text-[11px] font-medium ${
                          apiKey.active
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {apiKey.active ? "Active" : "Révoquée"}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <code className="text-xs text-slate-400 font-mono">
                        {visibleKeys.has(apiKey.id)
                          ? apiKey.key
                          : maskKey(apiKey.key)}
                      </code>
                      <button
                        onClick={() => toggleKeyVisibility(apiKey.id)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        {visibleKeys.has(apiKey.id) ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </button>
                      <button
                        onClick={() =>
                          copyToClipboard(apiKey.key, apiKey.id)
                        }
                        className="text-slate-400 hover:text-slate-600"
                      >
                        {copiedId === apiKey.id ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-400">
                      <span>
                        Créée le{" "}
                        {new Date(apiKey.createdAt).toLocaleDateString(
                          "fr-FR"
                        )}
                      </span>
                      {apiKey.lastUsed && (
                        <span>
                          Dernière utilisation :{" "}
                          {new Date(apiKey.lastUsed).toLocaleDateString(
                            "fr-FR"
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      {apiKey.active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevoke(apiKey.id)}
                          disabled={isPending}
                          title="Révoquer"
                          className="h-8 px-2 text-xs text-amber-600"
                        >
                          <Ban className="mr-1 h-3 w-3" />
                          Révoquer
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(apiKey.id)}
                        disabled={isPending}
                        title="Supprimer"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* API documentation snippet */}
      <Card className="border-0 bg-white shadow-sm">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">
            Utilisation rapide
          </h3>
          <pre className="rounded-lg bg-slate-900 p-4 text-xs text-slate-300 overflow-x-auto">
            <code>{`curl -X POST https://app.callaps.com/api/v1/calls \\
  -H "Authorization: Bearer clps_votre_cle_api" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "votre_agent_id",
    "to_number": "+33612345678",
    "name": "Jean Dupont"
  }'`}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
