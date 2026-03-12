"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  importPhoneNumberAction,
  updatePhoneNumberAction,
  deletePhoneNumberAction,
  makeOutboundCall,
  saveTwilioCredentials,
  configureTwilioWebhook,
  diagnoseTwilioConfig,
  updatePhoneSipCredentials,
} from "@/app/(dashboard)/phone-numbers/actions";
import {
  Plus,
  Search,
  Phone,
  Pencil,
  Trash2,
  PhoneOutgoing,
  PhoneIncoming,
  CheckCircle,
  AlertCircle,
  Settings2,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface PhoneNumberItem {
  id: string;
  number?: string;
  name?: string;
  assistantId?: string;
  provider?: string;
}

interface Agent {
  id: string;
  name: string;
  retellAgentId: string | null;
}

const GRADIENT_PAIRS = [
  { from: "from-indigo-500", to: "to-violet-500", shadow: "shadow-indigo-500/20" },
  { from: "from-emerald-500", to: "to-teal-500", shadow: "shadow-emerald-500/20" },
  { from: "from-rose-500", to: "to-pink-500", shadow: "shadow-rose-500/20" },
  { from: "from-amber-500", to: "to-orange-500", shadow: "shadow-amber-500/20" },
  { from: "from-cyan-500", to: "to-blue-500", shadow: "shadow-cyan-500/20" },
  { from: "from-fuchsia-500", to: "to-purple-500", shadow: "shadow-fuchsia-500/20" },
];

export function PhoneNumbersClient({
  initialNumbers,
  agents,
  hasTwilio = false,
}: {
  initialNumbers: PhoneNumberItem[];
  agents: Agent[];
  hasTwilio?: boolean;
}) {
  const [numbers] = useState(initialNumbers);
  const [selected, setSelected] = useState<PhoneNumberItem | null>(null);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Toast state
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Twilio config state
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioSaved, setTwilioSaved] = useState(hasTwilio);
  const [webhookResult, setWebhookResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isConfiguringWebhook, setIsConfiguringWebhook] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagResult, setDiagResult] = useState<{
    hasCreds: boolean;
    found: boolean;
    voiceUrl: string | null;
    isCorrect: boolean;
    expectedUrl: string | null;
    message: string;
  } | null>(null);

  // Import form state
  const [importMode, setImportMode] = useState<"twilio" | "sip">("twilio");
  const [importPhone, setImportPhone] = useState("");
  const [importLabel, setImportLabel] = useState("");
  const [importError, setImportError] = useState("");
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [importUri, setImportUri] = useState("");
  const [importUsername, setImportUsername] = useState("");
  const [importPassword, setImportPassword] = useState("");

  // Outbound call state
  const [callToNumber, setCallToNumber] = useState("");
  const [callContactName, setCallContactName] = useState("");
  const [callResult, setCallResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Outbound agent per phone number
  const [outboundAgents, setOutboundAgents] = useState<Record<string, string>>({});

  const filtered = numbers.filter(
    (n) =>
      (n.name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (n.number?.includes(search) ?? false)
  );

  const publishedAgents = agents.filter((a) => a.retellAgentId);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const resetImportForm = () => {
    setImportPhone("");
    setImportLabel("");
    setTwilioAccountSid("");
    setTwilioAuthToken("");
    setImportUri("");
    setImportUsername("");
    setImportPassword("");
    setImportError("");
  };

  const handleImport = () => {
    if (!importPhone) return;
    setImportError("");

    const terminationUri =
      importMode === "twilio"
        ? `${twilioAccountSid}.pstn.twilio.com`
        : importUri;

    if (!terminationUri) return;

    startTransition(async () => {
      try {
        await importPhoneNumberAction({
          phoneNumber: importPhone,
          terminationUri,
          nickname: importLabel || undefined,
          ...(importMode === "twilio"
            ? { twilioAccountSid, twilioAuthToken }
            : {}),
        });
        setImportOpen(false);
        resetImportForm();
        showToast("success", `Le numero ${importPhone} a ete importe avec succes !`);
        router.refresh();
      } catch (err) {
        const msg = String(err).replace("Error: ", "");
        setImportOpen(false);
        resetImportForm();
        showToast(
          "error",
          msg.includes("already")
            ? "Ce numero est deja importe."
            : msg.includes("Invalid")
              ? "Numero invalide. Verifiez le format (+33...)."
              : `Echec de l'import : ${msg}`
        );
      }
    });
  };

  const handleAssignInbound = (phoneNumber: string, agentId: string) => {
    const retellAgId =
      agentId === "none"
        ? null
        : (agents.find((a) => a.id === agentId)?.retellAgentId ?? null);
    startTransition(async () => {
      await updatePhoneNumberAction(phoneNumber, {
        inbound_agent_id: retellAgId,
      });
      router.refresh();
    });
  };

  const handleAssignOutbound = (phoneId: string, agentId: string) => {
    setOutboundAgents((prev) => ({ ...prev, [phoneId]: agentId }));
  };

  const handleDelete = (phoneNumber: string) => {
    if (!confirm("Supprimer ce numero de telephone ?")) return;
    startTransition(async () => {
      await deletePhoneNumberAction(phoneNumber);
      setSelected(null);
      router.refresh();
    });
  };

  const handleUpdateName = (phoneNumber: string, newName: string) => {
    setEditingName(false);
    startTransition(async () => {
      await updatePhoneNumberAction(phoneNumber, { nickname: newName });
      router.refresh();
    });
  };

  const handleMakeCall = () => {
    if (!selected || !callToNumber) return;
    const outboundAgentId = outboundAgents[selected.id];
    const agent = outboundAgentId
      ? agents.find((a) => a.id === outboundAgentId)
      : null;
    const retellAgId = agent?.retellAgentId ?? null;

    if (!retellAgId) {
      setCallResult({
        success: false,
        message: outboundAgentId
          ? `L'agent "${agent?.name}" n'est pas publie sur Retell. Publiez-le d'abord.`
          : "Veuillez d'abord selectionner un agent sortant pour ce numero.",
      });
      return;
    }

    setCallResult(null);
    startTransition(async () => {
      try {
        await makeOutboundCall({
          fromNumber: selected.id,
          agentId: retellAgId,
          toNumber: callToNumber,
        });
        setCallResult({ success: true, message: `Appel lance vers ${callToNumber}` });
        setTimeout(() => {
          setCallOpen(false);
          setCallToNumber("");
          setCallContactName("");
          setCallResult(null);
        }, 2000);
      } catch (err) {
        setCallResult({ success: false, message: String(err) });
      }
    });
  };

  // Find which agent is assigned to the selected number
  const inboundAgent = selected?.assistantId
    ? agents.find((a) => a.retellAgentId === selected.assistantId)
    : null;

  const currentOutboundAgentId = selected
    ? outboundAgents[selected.id] || "none"
    : "none";

  const selectedPhoneNumber = selected?.number || selected?.id || "";

  // Get inbound agent for a given number (for card display)
  const getInboundAgent = (num: PhoneNumberItem) =>
    num.assistantId
      ? agents.find((a) => a.retellAgentId === num.assistantId)
      : null;

  return (
    <div>
      <div className="p-8">
        {/* Toolbar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher un numero..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-64 pl-8"
              />
            </div>
            <p className="text-sm text-slate-500">
              {filtered.length} numero{filtered.length > 1 ? "s" : ""}
            </p>
          </div>
          <Button
            className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25"
            onClick={() => setImportOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Importer un numero
          </Button>
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25">
              <Phone className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              Aucun numero
            </h3>
            <p className="mb-6 mt-1 max-w-sm text-center text-sm text-slate-500">
              Importez votre premier numero de telephone pour commencer a recevoir et emettre des appels.
            </p>
            <Button
              className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25"
              onClick={() => setImportOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Importer un numero
            </Button>
          </div>
        ) : (
          /* Card grid */
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((num, i) => {
              const gradient = GRADIENT_PAIRS[i % GRADIENT_PAIRS.length];
              const agent = getInboundAgent(num);

              return (
                <Card
                  key={num.id}
                  className="group relative cursor-pointer overflow-hidden border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  onClick={() => {
                    setSelected(num);
                    setEditingName(false);
                    setWebhookResult(null);
                    setDiagResult(null);
                  }}
                >
                  {/* Gradient header band */}
                  <div
                    className={`h-16 bg-gradient-to-r ${gradient.from} ${gradient.to} relative`}
                  >
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-50" />
                    {/* Provider badge */}
                    <div className="absolute right-3 top-3">
                      <Badge className="border-0 bg-white/20 text-[10px] font-semibold text-white backdrop-blur-sm">
                        {num.provider === "twilio" ? "Twilio" : "SIP"}
                      </Badge>
                    </div>
                    {/* Phone icon */}
                    <div className="absolute left-4 -bottom-5">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white bg-white shadow-md ${gradient.shadow}`}
                      >
                        <Phone className="h-5 w-5 text-slate-600" />
                      </div>
                    </div>
                  </div>

                  <CardContent className="px-5 pb-5 pt-8">
                    <h3 className="truncate text-base font-semibold text-slate-900">
                      {num.name || "Numero sans nom"}
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-500">{num.number}</p>

                    {/* Agent chips */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {agent ? (
                        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700">
                          <PhoneIncoming className="h-3 w-3" />
                          {agent.name}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-400">
                          <PhoneIncoming className="h-3 w-3" />
                          Aucun agent entrant
                        </div>
                      )}
                      {outboundAgents[num.id] && outboundAgents[num.id] !== "none" ? (
                        <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11px] font-medium text-blue-700">
                          <PhoneOutgoing className="h-3 w-3" />
                          {agents.find((a) => a.id === outboundAgents[num.id])?.name}
                        </div>
                      ) : null}
                    </div>

                    {/* Footer */}
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        {twilioSaved ? (
                          <>
                            <ShieldCheck className="h-3 w-3 text-emerald-500" />
                            <span className="text-emerald-600">Twilio connecte</span>
                          </>
                        ) : (
                          <>
                            <Settings2 className="h-3 w-3" />
                            <span>Config requise</span>
                          </>
                        )}
                      </div>
                      <div className="opacity-0 transition-opacity group-hover:opacity-100">
                        <Settings2 className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="border-b pb-4">
                <div className="flex items-center gap-2 pr-8">
                  {editingName ? (
                    <input
                      autoFocus
                      defaultValue={selected.name || ""}
                      onBlur={(e) =>
                        handleUpdateName(selectedPhoneNumber, e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          handleUpdateName(
                            selectedPhoneNumber,
                            (e.target as HTMLInputElement).value
                          );
                      }}
                      className="border-b-2 border-indigo-500 bg-transparent text-base font-medium outline-none"
                    />
                  ) : (
                    <>
                      <SheetTitle className="truncate">
                        {selected.name || "Numero sans nom"}
                      </SheetTitle>
                      <button
                        onClick={() => setEditingName(true)}
                        className="shrink-0 text-slate-400 hover:text-slate-600"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
                <SheetDescription>{selected.number}</SheetDescription>
              </SheetHeader>

              <div className="space-y-5 p-4">
                {/* Quick actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setCallResult(null);
                      setCallOpen(true);
                    }}
                  >
                    <PhoneOutgoing className="h-4 w-4 mr-1.5" />
                    Appel sortant
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(selectedPhoneNumber)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Inbound agent */}
                <div className="rounded-lg border bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <PhoneIncoming className="h-4 w-4 text-green-600" />
                    <Label className="text-sm font-semibold text-slate-700">
                      Agent entrant
                    </Label>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Repond automatiquement aux appels entrants sur ce numero.
                  </p>
                  <Select
                    value={inboundAgent?.id ?? "none"}
                    onValueChange={(v) => {
                      if (v) handleAssignInbound(selectedPhoneNumber, v);
                    }}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Selectionner un agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun agent</SelectItem>
                      {publishedAgents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Outbound agent */}
                <div className="rounded-lg border bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <PhoneOutgoing className="h-4 w-4 text-blue-600" />
                    <Label className="text-sm font-semibold text-slate-700">
                      Agent sortant
                    </Label>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Agent utilise par defaut pour les appels sortants depuis ce numero.
                  </p>
                  <Select
                    value={currentOutboundAgentId}
                    onValueChange={(v) => {
                      if (v) handleAssignOutbound(selected.id, v);
                    }}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Selectionner un agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun agent</SelectItem>
                      {publishedAgents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Twilio Configuration */}
                <div className="rounded-lg border bg-slate-50/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4 text-slate-600" />
                      <Label className="text-sm font-semibold text-slate-700">
                        Configuration Twilio
                      </Label>
                    </div>
                    {twilioSaved && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Connecte
                      </span>
                    )}
                  </div>

                  {!twilioSaved ? (
                    <div className="space-y-3 mt-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Account SID</Label>
                        <Input
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          value={twilioSid}
                          onChange={(e) => setTwilioSid(e.target.value)}
                          className="h-9 text-sm bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Auth Token</Label>
                        <Input
                          type="password"
                          placeholder="Votre Auth Token Twilio"
                          value={twilioToken}
                          onChange={(e) => setTwilioToken(e.target.value)}
                          className="h-9 text-sm bg-white"
                        />
                      </div>
                      <Button
                        size="sm"
                        disabled={!twilioSid || !twilioToken || isPending}
                        className="w-full"
                        onClick={() => {
                          startTransition(async () => {
                            await saveTwilioCredentials(twilioSid, twilioToken);
                            setTwilioSaved(true);
                            setTwilioSid("");
                            setTwilioToken("");
                            if (inboundAgent?.retellAgentId) {
                              setIsConfiguringWebhook(true);
                              const res = await configureTwilioWebhook(
                                selectedPhoneNumber,
                                inboundAgent.retellAgentId
                              );
                              setWebhookResult({
                                type: res.success ? "success" : "error",
                                message: res.message,
                              });
                              setIsConfiguringWebhook(false);
                              if (res.success) {
                                setTimeout(() => setWebhookResult(null), 4000);
                              }
                            }
                          });
                        }}
                      >
                        {isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            Enregistrement...
                          </>
                        ) : (
                          "Enregistrer les identifiants"
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2.5 mt-3">
                      {inboundAgent?.retellAgentId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full bg-white"
                          disabled={isConfiguringWebhook}
                          onClick={async () => {
                            setIsConfiguringWebhook(true);
                            setWebhookResult(null);
                            const res = await configureTwilioWebhook(
                              selectedPhoneNumber,
                              inboundAgent.retellAgentId!
                            );
                            setWebhookResult({
                              type: res.success ? "success" : "error",
                              message: res.message,
                            });
                            setIsConfiguringWebhook(false);
                            if (res.success) {
                              setTimeout(() => setWebhookResult(null), 4000);
                            }
                          }}
                        >
                          {isConfiguringWebhook ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                              Configuration...
                            </>
                          ) : (
                            <>
                              <PhoneIncoming className="h-4 w-4 mr-1.5" />
                              Activer les appels entrants
                            </>
                          )}
                        </Button>
                      )}

                      {!inboundAgent && (
                        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2.5">
                          Selectionnez d&apos;abord un agent entrant ci-dessus, puis cliquez sur &quot;Activer les appels entrants&quot;.
                        </p>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full bg-white"
                        disabled={isConfiguringWebhook}
                        onClick={async () => {
                          setIsConfiguringWebhook(true);
                          setWebhookResult(null);
                          const res = await updatePhoneSipCredentials(selected!.id);
                          setWebhookResult({
                            type: res.success ? "success" : "error",
                            message: res.message,
                          });
                          setIsConfiguringWebhook(false);
                          if (res.success) {
                            setTimeout(() => setWebhookResult(null), 4000);
                          }
                        }}
                      >
                        {isConfiguringWebhook ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            Configuration...
                          </>
                        ) : (
                          <>
                            <PhoneOutgoing className="h-4 w-4 mr-1.5" />
                            Activer les appels sortants
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full text-slate-500 hover:text-slate-700"
                        disabled={isDiagnosing}
                        onClick={async () => {
                          setIsDiagnosing(true);
                          setDiagResult(null);
                          const res = await diagnoseTwilioConfig(selectedPhoneNumber);
                          setDiagResult(res);
                          setIsDiagnosing(false);
                        }}
                      >
                        {isDiagnosing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            Verification...
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4 mr-1.5" />
                            Diagnostiquer la config
                          </>
                        )}
                      </Button>

                      {diagResult && (
                        <div
                          className={cn(
                            "rounded-lg border p-3 text-xs space-y-1.5",
                            diagResult.isCorrect
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-amber-50 border-amber-200 text-amber-700"
                          )}
                        >
                          <p className="font-semibold">{diagResult.message}</p>
                          {diagResult.found && (
                            <>
                              <p>
                                <span className="font-medium">Voice URL actuelle :</span>{" "}
                                {diagResult.voiceUrl}
                              </p>
                              {!diagResult.isCorrect && diagResult.expectedUrl && (
                                <p>
                                  <span className="font-medium">URL attendue :</span>{" "}
                                  {diagResult.expectedUrl}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setTwilioSaved(false);
                          setWebhookResult(null);
                          setDiagResult(null);
                        }}
                        className="text-[11px] text-slate-400 hover:text-slate-600 underline"
                      >
                        Modifier les identifiants Twilio
                      </button>
                    </div>
                  )}

                  {webhookResult && (
                    <div
                      className={cn(
                        "mt-3 flex items-start gap-2 rounded-lg p-3 text-xs",
                        webhookResult.type === "success"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      )}
                    >
                      {webhookResult.type === "success" ? (
                        <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      )}
                      <span>{webhookResult.message}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importer un numero de telephone</DialogTitle>
            <DialogDescription>
              Connectez votre numero via Twilio ou SIP trunking
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-1 rounded-lg border p-0.5">
              <button
                type="button"
                onClick={() => setImportMode("twilio")}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  importMode === "twilio"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                Twilio
              </button>
              <button
                type="button"
                onClick={() => setImportMode("sip")}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  importMode === "sip"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                SIP Trunking
              </button>
            </div>

            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                placeholder="+33159580012"
                value={importPhone}
                onChange={(e) => setImportPhone(e.target.value)}
              />
            </div>

            {importMode === "twilio" && (
              <>
                <div className="space-y-2">
                  <Label>Twilio Account SID</Label>
                  <Input
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={twilioAccountSid}
                    onChange={(e) => setTwilioAccountSid(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Twilio Auth Token</Label>
                  <Input
                    type="password"
                    placeholder="Votre Auth Token Twilio"
                    value={twilioAuthToken}
                    onChange={(e) => setTwilioAuthToken(e.target.value)}
                  />
                </div>
              </>
            )}

            {importMode === "sip" && (
              <>
                <div className="space-y-2">
                  <Label>Termination URI</Label>
                  <Input
                    placeholder="sip.example.com"
                    value={importUri}
                    onChange={(e) => setImportUri(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SIP Trunk Username (Optional)</Label>
                  <Input
                    value={importUsername}
                    onChange={(e) => setImportUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SIP Trunk Password (Optional)</Label>
                  <Input
                    type="password"
                    value={importPassword}
                    onChange={(e) => setImportPassword(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Label (Optional)</Label>
              <Input
                placeholder="Mon numero principal"
                value={importLabel}
                onChange={(e) => setImportLabel(e.target.value)}
              />
            </div>

            {importError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{importError}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportOpen(false);
                resetImportForm();
              }}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleImport}
              disabled={
                !importPhone ||
                (importMode === "twilio"
                  ? !twilioAccountSid || !twilioAuthToken
                  : !importUri) ||
                isPending
              }
            >
              {isPending ? "Import..." : "Importer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Outbound Call Dialog */}
      <Dialog open={callOpen} onOpenChange={setCallOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Faire un appel sortant</DialogTitle>
            <DialogDescription>
              Depuis {selected?.number} avec l&apos;agent{" "}
              {currentOutboundAgentId !== "none"
                ? agents.find((a) => a.id === currentOutboundAgentId)?.name
                : "non defini"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Numero a appeler</Label>
              <Input
                placeholder="+33612345678"
                value={callToNumber}
                onChange={(e) => setCallToNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nom du contact (optionnel)</Label>
              <Input
                placeholder="Jean Dupont"
                value={callContactName}
                onChange={(e) => setCallContactName(e.target.value)}
              />
            </div>

            {callResult && (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg p-3 text-sm",
                  callResult.success
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                )}
              >
                {callResult.success ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{callResult.message}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCallOpen(false);
                setCallToNumber("");
                setCallContactName("");
                setCallResult(null);
              }}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button onClick={handleMakeCall} disabled={!callToNumber || isPending}>
              {isPending ? "Appel en cours..." : "Appeler"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl px-5 py-4 shadow-2xl border backdrop-blur-sm min-w-[320px] max-w-[440px]",
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                toast.type === "success" ? "bg-emerald-100" : "bg-red-100"
              )}
            >
              {toast.type === "success" ? (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                {toast.type === "success" ? "Numero importe" : "Erreur d'import"}
              </p>
              <p className="text-xs mt-0.5 opacity-80 truncate">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className={cn(
                "shrink-0 rounded-lg p-1 transition-colors",
                toast.type === "success"
                  ? "hover:bg-emerald-200/50"
                  : "hover:bg-red-200/50"
              )}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
