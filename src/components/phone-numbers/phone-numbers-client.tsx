"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [selected, setSelected] = useState<PhoneNumberItem | null>(
    initialNumbers[0] ?? null
  );
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Result popup state
  const [importResult, setImportResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Twilio config state
  const [twilioConfigOpen, setTwilioConfigOpen] = useState(false);
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
  // Twilio fields
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  // SIP fields
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

  // Outbound agent per phone number (stored in local state, not on Vapi)
  const [outboundAgents, setOutboundAgents] = useState<
    Record<string, string>
  >({});

  const filtered = numbers.filter(
    (n) =>
      (n.name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (n.number?.includes(search) ?? false)
  );

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

    // For Retell, both Twilio and SIP use termination_uri
    const terminationUri = importMode === "twilio"
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
            ? {
                twilioAccountSid: twilioAccountSid,
                twilioAuthToken: twilioAuthToken,
              }
            : {}),
        });
        setImportOpen(false);
        resetImportForm();
        setImportResult({
          type: "success",
          message: `Le numéro ${importPhone} a été importé avec succès !`,
        });
        setTimeout(() => setImportResult(null), 4000);
        router.refresh();
      } catch (err) {
        const msg = String(err).replace("Error: ", "");
        setImportOpen(false);
        resetImportForm();
        setImportResult({
          type: "error",
          message: msg.includes("already")
            ? "Ce numéro est déjà importé."
            : msg.includes("Invalid")
              ? "Numéro invalide. Vérifiez le format (+33...)."
              : `Échec de l'import : ${msg}`,
        });
        setTimeout(() => setImportResult(null), 5000);
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
    if (!confirm("Supprimer ce numéro de téléphone ?")) return;
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
          ? `L'agent "${agent?.name}" n'est pas publié sur Retell. Publiez-le d'abord.`
          : "Veuillez d'abord sélectionner un agent sortant pour ce numéro.",
      });
      return;
    }

    console.log("[handleMakeCall]", {
      fromNumber: selected.id,
      agentId: retellAgId,
      toNumber: callToNumber,
    });

    setCallResult(null);
    startTransition(async () => {
      try {
        await makeOutboundCall({
          fromNumber: selected.id,
          agentId: retellAgId,
          toNumber: callToNumber,
        });
        setCallResult({
          success: true,
          message: `Appel lancé vers ${callToNumber}`,
        });
        setTimeout(() => {
          setCallOpen(false);
          setCallToNumber("");
          setCallContactName("");
          setCallResult(null);
        }, 2000);
      } catch (err) {
        setCallResult({
          success: false,
          message: String(err),
        });
      }
    });
  };

  // Find which agent is assigned to the selected number (Retell stores inbound_agent_id)
  const inboundAgent = selected?.assistantId
    ? agents.find((a) => a.retellAgentId === selected.assistantId)
    : null;

  const currentOutboundAgentId = selected
    ? outboundAgents[selected.id] || "none"
    : "none";

  const publishedAgents = agents.filter((a) => a.retellAgentId);

  // For Retell, use phone_number as identifier
  const selectedPhoneNumber = selected?.number || selected?.id || "";

  return (
    <div className="flex h-[calc(100vh-140px)]">
      {/* Left sidebar - Number list */}
      <div className="w-72 border-r bg-white flex flex-col">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Recherche"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Button
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => setImportOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="p-6 text-center">
              <Phone className="mx-auto h-8 w-8 text-slate-200" />
              <p className="mt-2 text-sm text-slate-400">Aucun numéro</p>
            </div>
          ) : (
            filtered.map((num) => (
              <button
                key={num.id}
                onClick={() => {
                  setSelected(num);
                  setEditingName(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-3 border-b transition-colors",
                  selected?.id === num.id
                    ? "bg-indigo-50 border-l-2 border-l-indigo-500"
                    : "hover:bg-slate-50"
                )}
              >
                <p className="text-sm font-medium text-slate-900 truncate">
                  {num.name || "Numéro sans nom"}
                </p>
                <p className="text-xs text-slate-500">{num.number}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel - Number details */}
      <div className="flex-1 bg-slate-50">
        {selected ? (
          <div className="p-6 max-w-2xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="flex items-center gap-2">
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
                            selected.id,
                            (e.target as HTMLInputElement).value
                          );
                      }}
                      className="border-b-2 border-indigo-500 bg-transparent text-xl font-semibold outline-none"
                    />
                  ) : (
                    <>
                      <h2 className="text-xl font-semibold text-slate-900">
                        {selected.name || "Numéro sans nom"}
                      </h2>
                      <button
                        onClick={() => setEditingName(true)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {selected.number}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDelete(selectedPhoneNumber)}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Supprimer
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setCallResult(null);
                    setCallOpen(true);
                  }}
                >
                  <PhoneOutgoing className="h-4 w-4 mr-1" />
                  Faire un appel sortant
                </Button>
              </div>
            </div>

            {/* Agent entrant */}
            <div className="space-y-6">
              <div className="rounded-lg border bg-white p-5">
                <div className="flex items-center gap-2 mb-3">
                  <PhoneIncoming className="h-4 w-4 text-green-600" />
                  <Label className="text-sm font-semibold text-slate-700">
                    Agent entrant
                  </Label>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  L&apos;agent qui répond automatiquement aux appels entrants
                  sur ce numéro.
                </p>
                <Select
                  value={inboundAgent?.id ?? "none"}
                  onValueChange={(v) => {
                    if (v) handleAssignInbound(selectedPhoneNumber, v);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner un agent" />
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

              {/* Agent sortant */}
              <div className="rounded-lg border bg-white p-5">
                <div className="flex items-center gap-2 mb-3">
                  <PhoneOutgoing className="h-4 w-4 text-blue-600" />
                  <Label className="text-sm font-semibold text-slate-700">
                    Agent sortant
                  </Label>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  L&apos;agent utilisé par défaut pour les appels sortants
                  depuis ce numéro.
                </p>
                <Select
                  value={currentOutboundAgentId}
                  onValueChange={(v) => {
                    if (v) handleAssignOutbound(selected.id, v);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner un agent" />
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
              <div className="rounded-lg border bg-white p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-slate-600" />
                    <Label className="text-sm font-semibold text-slate-700">
                      Configuration Twilio
                    </Label>
                  </div>
                  {twilioSaved && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Connecté
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Nécessaire pour que les appels entrants soient dirigés vers votre agent IA.
                </p>

                {!twilioSaved ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Account SID</Label>
                      <Input
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        value={twilioSid}
                        onChange={(e) => setTwilioSid(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Auth Token</Label>
                      <Input
                        type="password"
                        placeholder="Votre Auth Token Twilio"
                        value={twilioToken}
                        onChange={(e) => setTwilioToken(e.target.value)}
                        className="h-9 text-sm"
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
                          // Auto-configure webhook if an inbound agent is assigned
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
                  <div className="space-y-3">
                    {inboundAgent?.retellAgentId && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
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
                        Sélectionnez d&apos;abord un agent entrant ci-dessus, puis cliquez sur &quot;Activer les appels entrants&quot;.
                      </p>
                    )}

                    {/* Activer appels sortants — envoie les creds SIP à Retell */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
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

                    {/* Diagnostic button */}
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
                          Vérification...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-1.5" />
                          Diagnostiquer la config Twilio
                        </>
                      )}
                    </Button>

                    {diagResult && (
                      <div className={cn(
                        "rounded-lg border p-3 text-xs space-y-1.5",
                        diagResult.isCorrect
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-amber-50 border-amber-200 text-amber-700"
                      )}>
                        <p className="font-semibold">{diagResult.message}</p>
                        {diagResult.found && (
                          <>
                            <p><span className="font-medium">Voice URL actuelle :</span> {diagResult.voiceUrl}</p>
                            {!diagResult.isCorrect && diagResult.expectedUrl && (
                              <p><span className="font-medium">URL attendue :</span> {diagResult.expectedUrl}</p>
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
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Phone className="mx-auto h-12 w-12 text-slate-200" />
              <p className="mt-3 text-sm text-slate-400">
                Sélectionnez un numéro ou importez-en un nouveau
              </p>
              <Button
                className="mt-4"
                size="sm"
                onClick={() => setImportOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Importer un numéro
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importer un numéro de téléphone</DialogTitle>
            <DialogDescription>
              Connectez votre numéro via Twilio ou SIP trunking
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
                placeholder="Mon numéro principal"
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
              onClick={() => { setImportOpen(false); resetImportForm(); }}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleImport}
              disabled={
                !importPhone ||
                (importMode === "twilio" ? (!twilioAccountSid || !twilioAuthToken) : !importUri) ||
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
                : "non défini"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Numéro à appeler</Label>
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
            <Button
              onClick={handleMakeCall}
              disabled={!callToNumber || isPending}
            >
              {isPending ? "Appel en cours..." : "Appeler"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import result toast */}
      {importResult && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl px-5 py-4 shadow-2xl border backdrop-blur-sm min-w-[320px] max-w-[440px]",
              importResult.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                importResult.type === "success"
                  ? "bg-emerald-100"
                  : "bg-red-100"
              )}
            >
              {importResult.type === "success" ? (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                {importResult.type === "success"
                  ? "Numéro importé"
                  : "Erreur d'import"}
              </p>
              <p className="text-xs mt-0.5 opacity-80 truncate">
                {importResult.message}
              </p>
            </div>
            <button
              onClick={() => setImportResult(null)}
              className={cn(
                "shrink-0 rounded-lg p-1 transition-colors",
                importResult.type === "success"
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
