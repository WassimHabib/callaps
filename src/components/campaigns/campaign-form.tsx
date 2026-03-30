"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCampaignFull } from "@/app/(dashboard)/campaigns/actions";
import {
  Upload,
  X,
  Users,
  Phone,
  Calendar,
  Clock,
  RotateCcw,
  Zap,
  ChevronDown,
  Bot,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Agent {
  id: string;
  name: string;
}

interface PhoneNumber {
  id: string;
  number: string;
}

interface Lead {
  name: string;
  phone: string;
  email?: string;
}

const DAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
  { value: 0, label: "Dim" },
];

const TIMEZONES = [
  "Europe/Paris",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Brussels",
  "Europe/Amsterdam",
  "Europe/Zurich",
  "Europe/Istanbul",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Africa/Casablanca",
  "Africa/Tunis",
  "Africa/Algiers",
];

export function CampaignForm({
  agents,
  phoneNumbers,
}: {
  agents: Agent[];
  phoneNumbers: PhoneNumber[];
}) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedPhoneNumbers, setSelectedPhoneNumbers] = useState<string[]>(
    []
  );
  const [callDays, setCallDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [callStartTime, setCallStartTime] = useState("09:00");
  const [callEndTime, setCallEndTime] = useState("17:00");
  const [timezoneMode, setTimezoneMode] = useState("fixed");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [maxRetries, setMaxRetries] = useState(1);
  const [retryIntervalH, setRetryIntervalH] = useState(1);
  const [callRateCount, setCallRateCount] = useState(20);
  const [callRateMinutes, setCallRateMinutes] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleDay = (day: number) => {
    setCallDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const togglePhone = (id: string) => {
    setSelectedPhoneNumbers((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const parseCSV = useCallback((text: string) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return;
    const header = lines[0].toLowerCase().split(/[,;]/);
    const nameIdx = header.findIndex((h) =>
      ["name", "nom", "prenom", "prénom"].includes(h.trim())
    );
    const phoneIdx = header.findIndex((h) =>
      [
        "phone",
        "telephone",
        "téléphone",
        "tel",
        "numero",
        "numéro",
        "number",
      ].includes(h.trim())
    );
    const emailIdx = header.findIndex((h) =>
      ["email", "mail", "e-mail"].includes(h.trim())
    );

    if (phoneIdx === -1) return;

    const parsed: Lead[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[,;]/);
      const phone = cols[phoneIdx]?.trim();
      if (!phone) continue;
      parsed.push({
        name: nameIdx >= 0 ? cols[nameIdx]?.trim() || "" : "",
        phone,
        email:
          emailIdx >= 0 ? cols[emailIdx]?.trim() || undefined : undefined,
      });
    }
    setLeads((prev) => [...prev, ...parsed]);
  }, []);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
        file.text().then(parseCSV);
      }
    },
    [parseCSV]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        file.text().then(parseCSV);
      }
    },
    [parseCSV]
  );

  const removeLead = (index: number) => {
    setLeads((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!agentId || !name) return;
    startTransition(async () => {
      const result = await createCampaignFull({
        name,
        agentId,
        startDate,
        leads,
        phoneNumberIds: selectedPhoneNumbers,
        callDays,
        callStartTime,
        callEndTime,
        timezoneMode,
        timezone,
        maxRetries,
        retryIntervalH,
        callRateCount,
        callRateMinutes,
      });
      router.push(`/campaigns/${result.id}`);
    });
  };

  return (
    <div className="mx-auto max-w-2xl p-6 pb-32">
      <div className="space-y-6">
        {/* Section 1: Essentials */}
        <Card className="border-0 shadow-sm">
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2">
              <Label>Nom de la campagne</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Relance clients mars 2026"
                className="h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5 text-slate-400" />
                  Agent IA
                </Label>
                {agents.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Creez d&apos;abord un agent IA.
                  </p>
                ) : (
                  <Select
                    value={agentId}
                    onValueChange={(v) => setAgentId(v ?? agentId)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selectionner un agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Date de debut
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>

            {/* Phone numbers */}
            {phoneNumbers.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  Numeros de telephone
                </Label>
                <p className="text-xs text-slate-500">
                  Numeros utilises pour les appels sortants.
                </p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {phoneNumbers.map((pn) => (
                    <button
                      key={pn.id}
                      type="button"
                      onClick={() => togglePhone(pn.id)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm transition-all",
                        selectedPhoneNumbers.includes(pn.id)
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700 font-medium"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      )}
                    >
                      {pn.number}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Contacts */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <Label className="flex items-center gap-1.5 text-base font-semibold">
                <Users className="h-4 w-4 text-slate-400" />
                Contacts a appeler
              </Label>
              {leads.length > 0 && (
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600">
                  {leads.length} lead{leads.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* CSV drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all",
                isDragging
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
              )}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <FileSpreadsheet className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    Deposez un fichier CSV ici
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Colonnes: nom, telephone, email (optionnel)
                  </p>
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>

            {/* Leads table */}
            {leads.length > 0 && (
              <div className="mt-4 max-h-60 overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium text-slate-600">
                        Nom
                      </th>
                      <th className="px-3 py-2 font-medium text-slate-600">
                        Telephone
                      </th>
                      <th className="px-3 py-2 font-medium text-slate-600">
                        Email
                      </th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead, i) => (
                      <tr key={i} className="border-t hover:bg-slate-50/50">
                        <td className="px-3 py-2">{lead.name || "—"}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {lead.phone}
                        </td>
                        <td className="px-3 py-2 text-slate-400">
                          {lead.email || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removeLead(i)}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Planning */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6 space-y-5">
            <Label className="flex items-center gap-1.5 text-base font-semibold">
              <Clock className="h-4 w-4 text-slate-400" />
              Quand les appels vont passer ?
            </Label>

            {/* Days as pill toggles */}
            <div className="space-y-2">
              <Label className="text-sm text-slate-600">Jours d&apos;appel</Label>
              <div className="flex gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      "flex-1 rounded-lg py-2 text-sm font-medium transition-all",
                      callDays.includes(day.value)
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hours */}
            <div className="space-y-2">
              <Label className="text-sm text-slate-600">
                Plage horaire
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="time"
                  value={callStartTime}
                  onChange={(e) => setCallStartTime(e.target.value)}
                  className="h-10 w-32"
                />
                <span className="text-slate-400">a</span>
                <Input
                  type="time"
                  value={callEndTime}
                  onChange={(e) => setCallEndTime(e.target.value)}
                  className="h-10 w-32"
                />
              </div>
            </div>

            {/* Timezone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm text-slate-600">
                  Mode fuseau horaire
                </Label>
                <Select
                  value={timezoneMode}
                  onValueChange={(v) => setTimezoneMode(v ?? "fixed")}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixe</SelectItem>
                    <SelectItem value="auto">Auto (par contact)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {timezoneMode === "fixed" && (
                <div className="space-y-2">
                  <Label className="text-sm text-slate-600">
                    Fuseau horaire
                  </Label>
                  <Select
                    value={timezone}
                    onValueChange={(v) => setTimezone(v ?? "Europe/Paris")}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Summary banner */}
            {leads.length > 0 && callDays.length > 0 && (
              <div className="rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-slate-900">
                      Recapitulatif de votre campagne
                    </p>
                    <div className="space-y-1 text-sm text-slate-600">
                      <p>
                        <span className="font-medium text-indigo-700">{leads.length} contact{leads.length > 1 ? "s" : ""}</span>{" "}
                        seront appeles a partir du{" "}
                        <span className="font-medium text-indigo-700">
                          {new Date(startDate + "T00:00:00").toLocaleDateString("fr-FR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </span>
                      </p>
                      <p>
                        Les appels passeront les{" "}
                        <span className="font-medium text-indigo-700">
                          {DAYS.filter((d) => callDays.includes(d.value))
                            .map((d) => d.label)
                            .join(", ")}
                        </span>{" "}
                        entre{" "}
                        <span className="font-medium text-indigo-700">{callStartTime}</span>{" "}
                        et{" "}
                        <span className="font-medium text-indigo-700">{callEndTime}</span>{" "}
                        <span className="text-slate-500">({timezone.replace("Europe/", "").replace("_", " ")})</span>
                      </p>
                      {maxRetries > 0 && (
                        <p className="text-slate-500">
                          Si un contact ne repond pas, jusqu&apos;a {maxRetries} relance{maxRetries > 1 ? "s" : ""} automatique{maxRetries > 1 ? "s" : ""} (toutes les {retryIntervalH}h)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Advanced settings (collapsible) */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex w-full items-center justify-between rounded-lg border bg-white px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-slate-400" />
              Parametres avances
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform",
                showAdvanced && "rotate-180"
              )}
            />
          </button>

          {showAdvanced && (
            <Card className="mt-2 border-0 shadow-sm">
              <CardContent className="pt-6 space-y-5">
                {/* Retries */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                    Tentatives de relance
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">
                        Nombre max
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={maxRetries}
                        onChange={(e) => setMaxRetries(Number(e.target.value))}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">
                        Intervalle (heures)
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={168}
                        value={retryIntervalH}
                        onChange={(e) =>
                          setRetryIntervalH(Number(e.target.value))
                        }
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Call Rate */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <Zap className="h-3.5 w-3.5 text-slate-400" />
                    Debit d&apos;appels
                  </Label>
                  <p className="text-xs text-slate-500">
                    Nombre d&apos;appels simultanes par intervalle.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={callRateCount}
                      onChange={(e) =>
                        setCallRateCount(Number(e.target.value))
                      }
                      className="h-10 w-20"
                    />
                    <span className="text-sm text-slate-500">appels /</span>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={callRateMinutes}
                      onChange={(e) =>
                        setCallRateMinutes(Number(e.target.value))
                      }
                      className="h-10 w-20"
                    />
                    <span className="text-sm text-slate-500">min</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <div className="text-sm text-slate-500">
            {leads.length > 0 ? (
              <span>
                <strong className="text-slate-900">{leads.length}</strong> contact{leads.length > 1 ? "s" : ""}{" "}
                &middot; {DAYS.filter((d) => callDays.includes(d.value)).map((d) => d.label).join(", ")}{" "}
                &middot; {callStartTime}-{callEndTime}
              </span>
            ) : (
              <span className="text-slate-400">Importez des contacts pour commencer</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!agentId || !name || isPending}
              className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25"
            >
              {isPending ? "Creation..." : "Creer la campagne"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
