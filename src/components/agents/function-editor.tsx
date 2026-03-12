"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PhoneOff,
  PhoneForwarded,
  CalendarCheck,
  CalendarPlus,
  Hash,
  SlidersHorizontal,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────
export interface AgentFunction {
  type: string;
  name: string;
  description: string;
  apiMethod?: string;
  apiUrl?: string;
  apiTimeout?: number;
  headers?: { key: string; value: string }[];
  queryParams?: { key: string; value: string }[];
  parameters?: string;
  responseVars?: { key: string; value: string }[];
  speakDuring?: boolean;
  speakAfter?: boolean;
  // Transfer call fields
  transferPhone?: string;
  transferType?: "cold_transfer" | "warm_transfer";
  transferMessage?: string;
}

// ─── Predefined templates ────────────────────────────────────
const TEMPLATES: {
  type: string;
  name: string;
  label: string;
  icon: React.ElementType;
  defaults: Partial<AgentFunction>;
}[] = [
  {
    type: "end_call",
    name: "end_call",
    label: "Fin d'appel",
    icon: PhoneOff,
    defaults: { description: "Termine l'appel en cours" },
  },
  {
    type: "transfer_call",
    name: "transfer_call",
    label: "Transférer un appel",
    icon: PhoneForwarded,
    defaults: { description: "Transfère l'appel vers un autre numéro" },
  },
  {
    type: "check_calendar",
    name: "check_calendar",
    label: "Vérifier disponibilité calendrier",
    icon: CalendarCheck,
    defaults: {
      description: "Vérifie les créneaux disponibles sur le calendrier",
      apiMethod: "GET",
      apiTimeout: 5000,
    },
  },
  {
    type: "book_calendar",
    name: "book_calendar",
    label: "Réserver au calendrier",
    icon: CalendarPlus,
    defaults: {
      description: "Réserve un créneau sur le calendrier",
      apiMethod: "POST",
      apiTimeout: 5000,
    },
  },
  {
    type: "dtmf",
    name: "dtmf",
    label: "Appuyez sur le chiffre (IVR)",
    icon: Hash,
    defaults: { description: "Envoie une tonalité DTMF pour naviguer dans un menu IVR" },
  },
  {
    type: "custom",
    name: "custom",
    label: "Custom",
    icon: SlidersHorizontal,
    defaults: {
      apiMethod: "POST",
      apiTimeout: 5000,
    },
  },
];

function iconForType(type: string) {
  const t = TEMPLATES.find((tpl) => tpl.type === type);
  return t?.icon ?? SlidersHorizontal;
}

// ─── Key-value pair editor ───────────────────────────────────
function KeyValueEditor({
  label,
  description,
  pairs,
  onChange,
}: {
  label: string;
  description: string;
  pairs: { key: string; value: string }[];
  onChange: (pairs: { key: string; value: string }[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[12px] font-semibold text-slate-700">{label}</Label>
      <p className="text-[11px] text-slate-400">{description}</p>
      {pairs.map((pair, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={pair.key}
            onChange={(e) => {
              const next = [...pairs];
              next[i] = { ...next[i], key: e.target.value };
              onChange(next);
            }}
            placeholder="Key"
            className="h-8 flex-1 rounded-lg border-slate-200 bg-slate-50 text-[12px]"
          />
          <Input
            value={pair.value}
            onChange={(e) => {
              const next = [...pairs];
              next[i] = { ...next[i], value: e.target.value };
              onChange(next);
            }}
            placeholder="Value"
            className="h-8 flex-1 rounded-lg border-slate-200 bg-slate-50 text-[12px]"
          />
          <button
            type="button"
            onClick={() => onChange(pairs.filter((_, j) => j !== i))}
            className="rounded p-1 text-slate-400 hover:text-red-500"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...pairs, { key: "", value: "" }])}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-[11px] font-medium text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700"
      >
        <Plus className="h-3 w-3" /> New key-value pair
      </button>
    </div>
  );
}

// ─── Function edit dialog ────────────────────────────────────
function FunctionDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: AgentFunction | null;
  onSave: (fn: AgentFunction) => void;
}) {
  const [fn, setFn] = useState<AgentFunction>(
    initial ?? {
      type: "custom",
      name: "",
      description: "",
      apiMethod: "POST",
      apiUrl: "",
      apiTimeout: 5000,
      headers: [],
      queryParams: [],
      parameters: "",
      responseVars: [],
      speakDuring: false,
      speakAfter: true,
    }
  );

  useEffect(() => {
    if (initial) setFn(initial);
  }, [initial]);

  const isSimple = ["end_call", "transfer_call", "dtmf"].includes(fn.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto p-0" showCloseButton={false}>
        <DialogHeader className="border-b border-slate-100 px-6 pt-6 pb-4">
          <DialogTitle className="text-base font-semibold text-slate-900">
            {initial ? "Modifier la fonction" : "Nouvelle fonction"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          {/* Nom */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-slate-700">Nom</Label>
            <Input
              value={fn.name}
              onChange={(e) => setFn({ ...fn, name: e.target.value })}
              placeholder="ex: book_appointment"
              className="h-9 rounded-lg border-slate-200 bg-slate-50 text-[13px]"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-slate-700">
              Description <span className="font-normal text-slate-400">(facultatif)</span>
            </Label>
            <Input
              value={fn.description}
              onChange={(e) => setFn({ ...fn, description: e.target.value })}
              className="h-9 rounded-lg border-slate-200 bg-slate-50 text-[13px]"
            />
          </div>

          {fn.type === "transfer_call" && (
            <>
              {/* Transfer phone */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold text-slate-700">Transférer vers</Label>
                <p className="text-[11px] text-slate-400">
                  Saisissez un numéro de téléphone statique.
                </p>
                <Input
                  value={fn.transferPhone ?? ""}
                  onChange={(e) => setFn({ ...fn, transferPhone: e.target.value })}
                  placeholder="+33651370395"
                  className="h-9 rounded-lg border-slate-200 bg-slate-50 text-[13px]"
                />
              </div>

              {/* Transfer type */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold text-slate-700">Type de transfert</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="transferType"
                      checked={fn.transferType === "cold_transfer"}
                      onChange={() => setFn({ ...fn, transferType: "cold_transfer" })}
                      className="h-4 w-4 accent-indigo-500"
                    />
                    <span className="text-[12px] text-slate-700">Transfert à froid</span>
                  </label>
                  <label className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="transferType"
                      checked={fn.transferType !== "cold_transfer"}
                      onChange={() => setFn({ ...fn, transferType: "warm_transfer" })}
                      className="h-4 w-4 accent-indigo-500"
                    />
                    <span className="text-[12px] text-slate-700">Transfert à chaud</span>
                  </label>
                </div>
              </div>

              {/* Transfer message (warm only) */}
              {fn.transferType !== "cold_transfer" && (
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold text-slate-700">Message de transfert</Label>
                  <Select
                    value={fn.speakDuring ? "prompt" : "static"}
                    onValueChange={(v) => setFn({ ...fn, speakDuring: v === "prompt" })}
                  >
                    <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-slate-50 text-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prompt">Rapide</SelectItem>
                      <SelectItem value="static">Texte statique</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={fn.transferMessage ?? ""}
                    onChange={(e) => setFn({ ...fn, transferMessage: e.target.value })}
                    rows={2}
                    placeholder="Dites bonjour à l'agent et résumez-lui le problème de l'utilisateur."
                    className="rounded-lg border-slate-200 bg-slate-50 text-[12px] transition-colors focus:bg-white"
                  />
                </div>
              )}
            </>
          )}

          {!isSimple && (
            <>
              {/* API endpoint */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold text-slate-700">api_endpoint</Label>
                <div className="flex gap-2">
                  <Select
                    value={fn.apiMethod ?? "POST"}
                    onValueChange={(v) => setFn({ ...fn, apiMethod: v ?? "POST" })}
                  >
                    <SelectTrigger className="h-9 w-[90px] rounded-lg border-slate-200 bg-slate-50 text-[12px] font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={fn.apiUrl ?? ""}
                    onChange={(e) => setFn({ ...fn, apiUrl: e.target.value })}
                    placeholder="Entrez l'URL de la fonction personnalisée"
                    className="h-9 flex-1 rounded-lg border-slate-200 bg-slate-50 text-[13px]"
                  />
                </div>
              </div>

              {/* Timeout */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold text-slate-700">
                  Délai d&apos;expiration de l&apos;API
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={fn.apiTimeout ?? 5000}
                    onChange={(e) => setFn({ ...fn, apiTimeout: Number(e.target.value) })}
                    className="h-9 w-[120px] rounded-lg border-slate-200 bg-slate-50 text-[13px]"
                  />
                  <span className="text-[12px] text-slate-400">millisecondes</span>
                </div>
              </div>

              {/* Headers */}
              <KeyValueEditor
                label="Headers"
                description="Specify the HTTP headers required for your API request."
                pairs={fn.headers ?? []}
                onChange={(headers) => setFn({ ...fn, headers })}
              />

              {/* Query Params */}
              <KeyValueEditor
                label="Query Parameters"
                description="Query string parameters to append to the URL."
                pairs={fn.queryParams ?? []}
                onChange={(queryParams) => setFn({ ...fn, queryParams })}
              />

              {/* Parameters JSON */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold text-slate-700">
                  Paramètres <span className="font-normal text-slate-400">(facultatif)</span>
                </Label>
                <p className="text-[11px] text-slate-400">
                  Schéma JSON qui définit le format dans lequel le LLM sera renvoyé.
                </p>
                <Textarea
                  value={fn.parameters ?? ""}
                  onChange={(e) => setFn({ ...fn, parameters: e.target.value })}
                  rows={5}
                  placeholder='{"type": "object", "properties": {...}}'
                  className="rounded-lg border-slate-200 bg-slate-50 font-mono text-[11px] transition-colors focus:bg-white"
                />
              </div>

              {/* Response Variables */}
              <KeyValueEditor
                label="Response Variables"
                description="Extracted values from API response saved as dynamic variables."
                pairs={fn.responseVars ?? []}
                onChange={(responseVars) => setFn({ ...fn, responseVars })}
              />
            </>
          )}

          {/* Speak options */}
          <div className="space-y-3 rounded-lg border border-slate-100 p-3">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={fn.speakDuring ?? false}
                onChange={(e) => setFn({ ...fn, speakDuring: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-indigo-500"
              />
              <div>
                <p className="text-[12px] font-medium text-slate-700">Parler pendant l&apos;exécution</p>
                <p className="text-[11px] text-slate-400">
                  Si la fonction prend plus de 2 secondes, l&apos;agent peut dire quelque chose
                  comme : « Laissez-moi vérifier cela pour vous. »
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={fn.speakAfter ?? true}
                onChange={(e) => setFn({ ...fn, speakAfter: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-indigo-500"
              />
              <div>
                <p className="text-[12px] font-medium text-slate-700">Parler après l&apos;exécution</p>
                <p className="text-[11px] text-slate-400">
                  Désélectionnez cette option si vous souhaitez exécuter la fonction en mode
                  silencieux.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-lg text-[12px]"
          >
            Annuler
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onSave(fn);
              onOpenChange(false);
            }}
            className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-[12px] text-white"
          >
            Sauvegarder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ──────────────────────────────────────────
interface FunctionEditorProps {
  functions: AgentFunction[];
  onChange: (functions: AgentFunction[]) => void;
}

export function FunctionEditor({ functions, onChange }: FunctionEditorProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newFnDefaults, setNewFnDefaults] = useState<Partial<AgentFunction> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const addFromTemplate = (tpl: (typeof TEMPLATES)[number]) => {
    setMenuOpen(false);
    if (tpl.type === "custom" || tpl.type === "transfer_call") {
      setEditingIndex(null);
      setNewFnDefaults({
        type: tpl.type,
        name: tpl.name,
        description: tpl.defaults.description ?? "",
        ...tpl.defaults,
        ...(tpl.type === "transfer_call" ? { transferType: "warm_transfer" as const } : {}),
      });
      setDialogOpen(true);
      return;
    }
    // For predefined, add directly
    onChange([
      ...functions,
      {
        type: tpl.type,
        name: tpl.name,
        description: tpl.defaults.description ?? "",
        ...tpl.defaults,
      },
    ]);
  };

  const editFunction = (index: number) => {
    setEditingIndex(index);
    setDialogOpen(true);
  };

  const deleteFunction = (index: number) => {
    onChange(functions.filter((_, i) => i !== index));
  };

  const handleSave = (fn: AgentFunction) => {
    if (editingIndex !== null) {
      const next = [...functions];
      next[editingIndex] = fn;
      onChange(next);
    } else {
      onChange([...functions, fn]);
    }
    setEditingIndex(null);
  };

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-slate-500">
        Offrez à votre agent des fonctionnalités telles que les réservations de calendrier,
        la terminaison d&apos;appel, etc.
      </p>

      {/* Function list */}
      {functions.length > 0 && (
        <div className="space-y-2">
          {functions.map((fn, i) => {
            const Icon = iconForType(fn.type);
            return (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-slate-500" />
                  <span className="text-[13px] font-medium text-slate-800">{fn.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => editFunction(i)}
                    className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteFunction(i)}
                    className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add button with dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Ajouter <Plus className="h-3.5 w-3.5" />
        </button>

        {menuOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 w-[320px] rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
            {TEMPLATES.map((tpl) => {
              const Icon = tpl.icon;
              return (
                <button
                  key={tpl.type}
                  type="button"
                  onClick={() => addFromTemplate(tpl)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50"
                >
                  <Icon className="h-4 w-4 text-slate-500" />
                  <span className="text-[13px] text-slate-700">{tpl.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <FunctionDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setNewFnDefaults(null);
        }}
        initial={editingIndex !== null ? functions[editingIndex] : newFnDefaults ? (newFnDefaults as AgentFunction) : null}
        onSave={handleSave}
      />
    </div>
  );
}
