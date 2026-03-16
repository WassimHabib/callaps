"use client";

import { useState, useTransition, useEffect } from "react";
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
  PhoneCall,
  Globe,
  Signal,
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
  const [numbers, setNumbers] = useState(initialNumbers);
  useEffect(() => setNumbers(initialNumbers), [initialNumbers]);

  const [selected, setSelected] = useState<PhoneNumberItem | null>(null);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Twilio config
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioSaved, setTwilioSaved] = useState(hasTwilio);
  const [webhookResult, setWebhookResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isConfiguringWebhook, setIsConfiguringWebhook] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagResult, setDiagResult] = useState<{
    hasCreds: boolean; found: boolean; voiceUrl: string | null;
    isCorrect: boolean; expectedUrl: string | null; message: string;
  } | null>(null);

  // Import form
  const [importMode, setImportMode] = useState<"twilio" | "sip">("twilio");
  const [importPhone, setImportPhone] = useState("");
  const [importLabel, setImportLabel] = useState("");
  const [importError, setImportError] = useState("");
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [importUri, setImportUri] = useState("");
  const [importUsername, setImportUsername] = useState("");
  const [importPassword, setImportPassword] = useState("");

  // Outbound call
  const [callToNumber, setCallToNumber] = useState("");
  const [callContactName, setCallContactName] = useState("");
  const [callResult, setCallResult] = useState<{ success: boolean; message: string } | null>(null);

  // Outbound agent per phone
  const [outboundAgents, setOutboundAgents] = useState<Record<string, string>>({});

  // Delete confirm dialog
  const [deleteTarget, setDeleteTarget] = useState<PhoneNumberItem | null>(null);

  const filtered = numbers.filter(
    (n) =>
      (n.name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (n.number?.includes(search) ?? false)
  );

  const publishedAgents = agents.filter((a) => a.retellAgentId);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
  };

  const resetImportForm = () => {
    setImportPhone(""); setImportLabel(""); setTwilioAccountSid(""); setTwilioAuthToken("");
    setImportUri(""); setImportUsername(""); setImportPassword(""); setImportError("");
  };

  const handleImport = () => {
    if (!importPhone) return;
    setImportError("");
    const terminationUri = importMode === "twilio" ? `${twilioAccountSid}.pstn.twilio.com` : importUri;
    if (!terminationUri) return;
    startTransition(async () => {
      try {
        await importPhoneNumberAction({
          phoneNumber: importPhone, terminationUri, nickname: importLabel || undefined,
          ...(importMode === "twilio" ? { twilioAccountSid, twilioAuthToken } : {}),
        });
        setImportOpen(false); resetImportForm();
        showToast("success", `Numéro ${importPhone} importé avec succès !`);
        router.refresh();
      } catch (err) {
        const msg = String(err).replace("Error: ", "");
        setImportOpen(false); resetImportForm();
        showToast("error", msg.includes("already") ? "Ce numéro est déjà importé." : msg.includes("Invalid") ? "Numéro invalide. Vérifiez le format (+33...)." : `Échec : ${msg}`);
      }
    });
  };

  const handleAssignInbound = (phoneNumber: string, agentId: string) => {
    const retellAgId = agentId === "none" ? null : (agents.find((a) => a.id === agentId)?.retellAgentId ?? null);
    startTransition(async () => {
      try {
        await updatePhoneNumberAction(phoneNumber, { inbound_agent_id: retellAgId });
        router.refresh();
        showToast("success", "Agent entrant mis à jour");
      } catch { showToast("error", "Erreur lors de la mise à jour"); }
    });
  };

  const handleAssignOutbound = (phoneId: string, agentId: string) => {
    setOutboundAgents((prev) => ({ ...prev, [phoneId]: agentId }));
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const phoneNumber = deleteTarget.number || deleteTarget.id;
    startTransition(async () => {
      await deletePhoneNumberAction(phoneNumber);
      setDeleteTarget(null);
      setSelected(null);
      showToast("success", "Numéro supprimé");
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
    const agent = outboundAgentId ? agents.find((a) => a.id === outboundAgentId) : null;
    const retellAgId = agent?.retellAgentId ?? null;
    if (!retellAgId) {
      setCallResult({ success: false, message: outboundAgentId ? `L'agent "${agent?.name}" n'est pas publié sur Retell.` : "Sélectionnez d'abord un agent sortant." });
      return;
    }
    setCallResult(null);
    startTransition(async () => {
      try {
        await makeOutboundCall({ fromNumber: selected.id, agentId: retellAgId, toNumber: callToNumber });
        setCallResult({ success: true, message: `Appel lancé vers ${callToNumber}` });
        setTimeout(() => { setCallOpen(false); setCallToNumber(""); setCallContactName(""); setCallResult(null); }, 2000);
      } catch (err) { setCallResult({ success: false, message: String(err) }); }
    });
  };

  const inboundAgent = selected?.assistantId ? agents.find((a) => a.retellAgentId === selected.assistantId) : null;
  const currentOutboundAgentId = selected ? outboundAgents[selected.id] || "none" : "none";
  const selectedPhoneNumber = selected?.number || selected?.id || "";
  const getInboundAgent = (num: PhoneNumberItem) => num.assistantId ? agents.find((a) => a.retellAgentId === num.assistantId) : null;

  return (
    <div>
      <div className="p-6 sm:p-8">
        {/* Stats bar */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                <Phone className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{numbers.length}</p>
                <p className="text-xs text-slate-500">Numéros</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <PhoneIncoming className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{numbers.filter((n) => n.assistantId).length}</p>
                <p className="text-xs text-slate-500">Entrants actifs</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <PhoneOutgoing className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{Object.values(outboundAgents).filter((v) => v !== "none").length}</p>
                <p className="text-xs text-slate-500">Sortants configurés</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                <ShieldCheck className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{twilioSaved ? "Oui" : "Non"}</p>
                <p className="text-xs text-slate-500">Twilio connecté</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Rechercher un numéro..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-72 pl-9"
              />
            </div>
            <p className="text-sm text-slate-500">
              {filtered.length} numéro{filtered.length > 1 ? "s" : ""}
            </p>
          </div>
          <Button
            className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25"
            onClick={() => setImportOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Importer un numéro
          </Button>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25">
              <Phone className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Aucun numéro</h3>
            <p className="mb-6 mt-1 max-w-sm text-center text-sm text-slate-500">
              Importez votre premier numéro de téléphone pour commencer à recevoir et émettre des appels.
            </p>
            <Button
              className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25"
              onClick={() => setImportOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Importer un numéro
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((num, i) => {
              const gradient = GRADIENT_PAIRS[i % GRADIENT_PAIRS.length];
              const agent = getInboundAgent(num);
              const outAgent = outboundAgents[num.id] && outboundAgents[num.id] !== "none"
                ? agents.find((a) => a.id === outboundAgents[num.id])
                : null;

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
                  <div className={`h-20 bg-gradient-to-r ${gradient.from} ${gradient.to} relative`}>
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-50" />
                    {/* Provider badge */}
                    <div className="absolute right-3 top-3">
                      <Badge className="border-0 bg-white/20 text-[10px] font-semibold text-white backdrop-blur-sm">
                        {num.provider === "twilio" ? "Twilio" : "SIP"}
                      </Badge>
                    </div>
                    {/* Phone icon */}
                    <div className="absolute left-4 -bottom-5">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 border-white bg-white shadow-lg ${gradient.shadow}`}>
                        <Phone className="h-5 w-5 text-slate-600" />
                      </div>
                    </div>
                  </div>

                  <CardContent className="px-5 pb-5 pt-9">
                    <h3 className="truncate text-base font-semibold text-slate-900 group-hover:text-indigo-600">
                      {num.name || "Numéro sans nom"}
                    </h3>
                    <p className="mt-0.5 text-sm font-mono text-slate-500">{num.number}</p>

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
                      {outAgent && (
                        <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11px] font-medium text-blue-700">
                          <PhoneOutgoing className="h-3 w-3" />
                          {outAgent.name}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        {twilioSaved ? (
                          <>
                            <ShieldCheck className="h-3 w-3 text-emerald-500" />
                            <span className="text-emerald-600">Twilio connecté</span>
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
                      onBlur={(e) => handleUpdateName(selectedPhoneNumber, e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleUpdateName(selectedPhoneNumber, (e.target as HTMLInputElement).value); }}
                      className="border-b-2 border-indigo-500 bg-transparent text-base font-medium outline-none"
                    />
                  ) : (
                    <>
                      <SheetTitle className="truncate">
                        {selected.name || "Numéro sans nom"}
                      </SheetTitle>
                      <button onClick={() => setEditingName(true)} className="shrink-0 text-slate-400 hover:text-slate-600">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
                <SheetDescription className="font-mono">{selected.number}</SheetDescription>
              </SheetHeader>

              <div className="space-y-5 p-4">
                {/* Quick actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
                    onClick={() => { setCallResult(null); setCallOpen(true); }}
                  >
                    <PhoneOutgoing className="h-4 w-4 mr-1.5" />
                    Appel sortant
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteTarget(selected)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Inbound agent */}
                <div className="rounded-xl border bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <PhoneIncoming className="h-4 w-4 text-emerald-600" />
                    <Label className="text-sm font-semibold text-slate-700">Agent entrant</Label>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">Répond automatiquement aux appels entrants.</p>
                  <Select
                    value={inboundAgent?.id ?? "none"}
                    onValueChange={(v) => { if (v) handleAssignInbound(selectedPhoneNumber, v); }}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue>{inboundAgent ? inboundAgent.name : "Aucun agent"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun agent</SelectItem>
                      {publishedAgents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Outbound agent */}
                <div className="rounded-xl border bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <PhoneOutgoing className="h-4 w-4 text-blue-600" />
                    <Label className="text-sm font-semibold text-slate-700">Agent sortant</Label>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">Agent utilisé pour les appels sortants depuis ce numéro.</p>
                  <Select
                    value={currentOutboundAgentId}
                    onValueChange={(v) => { if (v) handleAssignOutbound(selected.id, v); }}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue>
                        {currentOutboundAgentId !== "none"
                          ? agents.find((a) => a.id === currentOutboundAgentId)?.name || "Aucun agent"
                          : "Aucun agent"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun agent</SelectItem>
                      {publishedAgents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Twilio Configuration */}
                <div className="rounded-xl border bg-slate-50/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4 text-slate-600" />
                      <Label className="text-sm font-semibold text-slate-700">Configuration Twilio</Label>
                    </div>
                    {twilioSaved && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Connecté
                      </span>
                    )}
                  </div>

                  {!twilioSaved ? (
                    <div className="space-y-3 mt-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Account SID</Label>
                        <Input placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={twilioSid} onChange={(e) => setTwilioSid(e.target.value)} className="h-9 text-sm bg-white" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Auth Token</Label>
                        <Input type="password" placeholder="Votre Auth Token Twilio" value={twilioToken} onChange={(e) => setTwilioToken(e.target.value)} className="h-9 text-sm bg-white" />
                      </div>
                      <Button
                        size="sm" disabled={!twilioSid || !twilioToken || isPending} className="w-full"
                        onClick={() => {
                          startTransition(async () => {
                            await saveTwilioCredentials(twilioSid, twilioToken);
                            setTwilioSaved(true); setTwilioSid(""); setTwilioToken("");
                            if (inboundAgent?.retellAgentId) {
                              setIsConfiguringWebhook(true);
                              const res = await configureTwilioWebhook(selectedPhoneNumber, inboundAgent.retellAgentId);
                              setWebhookResult({ type: res.success ? "success" : "error", message: res.message });
                              setIsConfiguringWebhook(false);
                              if (res.success) setTimeout(() => setWebhookResult(null), 4000);
                            }
                          });
                        }}
                      >
                        {isPending ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Enregistrement...</> : "Enregistrer les identifiants"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2.5 mt-3">
                      {inboundAgent?.retellAgentId && (
                        <Button size="sm" variant="outline" className="w-full bg-white" disabled={isConfiguringWebhook}
                          onClick={async () => {
                            setIsConfiguringWebhook(true); setWebhookResult(null);
                            const res = await configureTwilioWebhook(selectedPhoneNumber, inboundAgent.retellAgentId!);
                            setWebhookResult({ type: res.success ? "success" : "error", message: res.message });
                            setIsConfiguringWebhook(false);
                            if (res.success) setTimeout(() => setWebhookResult(null), 4000);
                          }}
                        >
                          {isConfiguringWebhook ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Configuration...</> : <><PhoneIncoming className="h-4 w-4 mr-1.5" />Activer les appels entrants</>}
                        </Button>
                      )}
                      {!inboundAgent && (
                        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2.5">
                          Sélectionnez d&apos;abord un agent entrant ci-dessus, puis cliquez sur &quot;Activer les appels entrants&quot;.
                        </p>
                      )}
                      <Button size="sm" variant="outline" className="w-full bg-white" disabled={isConfiguringWebhook}
                        onClick={async () => {
                          setIsConfiguringWebhook(true); setWebhookResult(null);
                          const res = await updatePhoneSipCredentials(selected!.id);
                          setWebhookResult({ type: res.success ? "success" : "error", message: res.message });
                          setIsConfiguringWebhook(false);
                          if (res.success) setTimeout(() => setWebhookResult(null), 4000);
                        }}
                      >
                        {isConfiguringWebhook ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Configuration...</> : <><PhoneOutgoing className="h-4 w-4 mr-1.5" />Activer les appels sortants</>}
                      </Button>
                      <Button size="sm" variant="ghost" className="w-full text-slate-500 hover:text-slate-700" disabled={isDiagnosing}
                        onClick={async () => {
                          setIsDiagnosing(true); setDiagResult(null);
                          const res = await diagnoseTwilioConfig(selectedPhoneNumber);
                          setDiagResult(res); setIsDiagnosing(false);
                        }}
                      >
                        {isDiagnosing ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Vérification...</> : <><Search className="h-4 w-4 mr-1.5" />Diagnostiquer la config</>}
                      </Button>

                      {diagResult && (
                        <div className={cn("rounded-lg border p-3 text-xs space-y-1.5", diagResult.isCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700")}>
                          <p className="font-semibold">{diagResult.message}</p>
                          {diagResult.found && (
                            <>
                              <p><span className="font-medium">Voice URL actuelle :</span> {diagResult.voiceUrl}</p>
                              {!diagResult.isCorrect && diagResult.expectedUrl && <p><span className="font-medium">URL attendue :</span> {diagResult.expectedUrl}</p>}
                            </>
                          )}
                        </div>
                      )}

                      <button onClick={() => { setTwilioSaved(false); setWebhookResult(null); setDiagResult(null); }} className="text-[11px] text-slate-400 hover:text-slate-600 underline">
                        Modifier les identifiants Twilio
                      </button>
                    </div>
                  )}

                  {webhookResult && (
                    <div className={cn("mt-3 flex items-start gap-2 rounded-lg p-3 text-xs", webhookResult.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200")}>
                      {webhookResult.type === "success" ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                      <span>{webhookResult.message}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer le numéro</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deleteTarget?.name || deleteTarget?.number}</strong> ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button onClick={handleDelete} disabled={isPending} variant="destructive">
              {isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importer un numéro</DialogTitle>
            <DialogDescription>Connectez votre numéro via Twilio ou SIP trunking</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-1 rounded-xl border p-1">
              <button type="button" onClick={() => setImportMode("twilio")}
                className={cn("flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  importMode === "twilio" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100")}>
                <Globe className="h-3.5 w-3.5" />
                Twilio
              </button>
              <button type="button" onClick={() => setImportMode("sip")}
                className={cn("flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  importMode === "sip" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100")}>
                <Signal className="h-3.5 w-3.5" />
                SIP Trunking
              </button>
            </div>

            <div className="space-y-2">
              <Label>Numéro de téléphone</Label>
              <Input placeholder="+33159580012" value={importPhone} onChange={(e) => setImportPhone(e.target.value)} />
            </div>

            {importMode === "twilio" && (
              <>
                <div className="space-y-2">
                  <Label>Twilio Account SID</Label>
                  <Input placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={twilioAccountSid} onChange={(e) => setTwilioAccountSid(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Twilio Auth Token</Label>
                  <Input type="password" placeholder="Votre Auth Token Twilio" value={twilioAuthToken} onChange={(e) => setTwilioAuthToken(e.target.value)} />
                </div>
              </>
            )}

            {importMode === "sip" && (
              <>
                <div className="space-y-2">
                  <Label>Termination URI</Label>
                  <Input placeholder="sip.example.com" value={importUri} onChange={(e) => setImportUri(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Username (optionnel)</Label>
                  <Input value={importUsername} onChange={(e) => setImportUsername(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Password (optionnel)</Label>
                  <Input type="password" value={importPassword} onChange={(e) => setImportPassword(e.target.value)} />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Nom (optionnel)</Label>
              <Input placeholder="Mon numéro principal" value={importLabel} onChange={(e) => setImportLabel(e.target.value)} />
            </div>

            {importError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{importError}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportOpen(false); resetImportForm(); }} disabled={isPending}>Annuler</Button>
            <Button onClick={handleImport}
              disabled={!importPhone || (importMode === "twilio" ? !twilioAccountSid || !twilioAuthToken : !importUri) || isPending}
              className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
            >
              {isPending ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Import...</> : "Importer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Outbound Call Dialog */}
      <Dialog open={callOpen} onOpenChange={setCallOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Appel sortant</DialogTitle>
            <DialogDescription>
              Depuis <span className="font-mono font-medium">{selected?.number}</span> avec l&apos;agent{" "}
              {currentOutboundAgentId !== "none" ? agents.find((a) => a.id === currentOutboundAgentId)?.name : "non défini"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Numéro à appeler</Label>
              <Input placeholder="+33612345678" value={callToNumber} onChange={(e) => setCallToNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nom du contact (optionnel)</Label>
              <Input placeholder="Jean Dupont" value={callContactName} onChange={(e) => setCallContactName(e.target.value)} />
            </div>
            {callResult && (
              <div className={cn("flex items-center gap-2 rounded-lg p-3 text-sm", callResult.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                {callResult.success ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{callResult.message}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCallOpen(false); setCallToNumber(""); setCallContactName(""); setCallResult(null); }} disabled={isPending}>Annuler</Button>
            <Button onClick={handleMakeCall} disabled={!callToNumber || isPending}
              className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
            >
              {isPending ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Appel...</> : <><PhoneCall className="h-4 w-4 mr-1.5" />Appeler</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className={cn(
            "flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium shadow-lg",
            toast.type === "success" ? "bg-emerald-600 text-white shadow-emerald-500/25" : "bg-red-600 text-white shadow-red-500/25"
          )}>
            {toast.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
