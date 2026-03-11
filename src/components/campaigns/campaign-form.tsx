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
  { value: 0, label: "Dimanche" },
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
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
  const [name, setName] = useState("My Campaign");
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
  const [leadsTab, setLeadsTab] = useState<"all" | "csv">("all");
  const [isDragging, setIsDragging] = useState(false);
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
      ["phone", "telephone", "téléphone", "tel", "numero", "numéro", "number"].includes(h.trim())
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
        email: emailIdx >= 0 ? cols[emailIdx]?.trim() || undefined : undefined,
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
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Créer une campagne
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Créez une campagne pour envoyer des messages à vos leads.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left column - Form */}
        <div className="col-span-2 space-y-6">
          {/* Name + Date + Agent */}
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom de la campagne</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Campaign"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date de début de la campagne</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Agent IA</Label>
                {agents.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Vous devez d&apos;abord créer un agent IA.
                  </p>
                ) : (
                  <Select value={agentId} onValueChange={(v) => setAgentId(v ?? agentId)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un agent" />
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
            </CardContent>
          </Card>

          {/* Leads */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-slate-500" />
                <Label className="text-base font-semibold">
                  Leads à appeler ({leads.length})
                </Label>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex gap-1 rounded-lg border p-0.5">
                  <button
                    type="button"
                    onClick={() => setLeadsTab("all")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      leadsTab === "all"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    All Leads
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeadsTab("csv")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      leadsTab === "csv"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    Télécharger un fichier CSV
                  </button>
                </div>
              </div>

              {leadsTab === "csv" && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                    isDragging
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <Upload className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-sm text-slate-600">
                    Déposez le fichier ici ou cliquez pour parcourir
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    CSV avec colonnes: nom, téléphone, email (optionnel)
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </div>
              )}

              {leadsTab === "all" && leads.length === 0 && (
                <div className="rounded-lg border-2 border-dashed p-8 text-center">
                  <Users className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">
                    Aucun lead. Importez un fichier CSV pour ajouter des leads.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setLeadsTab("csv")}
                  >
                    Importer CSV
                  </Button>
                </div>
              )}

              {leads.length > 0 && leadsTab === "all" && (
                <div className="max-h-60 overflow-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left">
                      <tr>
                        <th className="px-3 py-2 font-medium text-slate-600">
                          Nom
                        </th>
                        <th className="px-3 py-2 font-medium text-slate-600">
                          Téléphone
                        </th>
                        <th className="px-3 py-2 font-medium text-slate-600">
                          Email
                        </th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">{lead.name || "—"}</td>
                          <td className="px-3 py-2">{lead.phone}</td>
                          <td className="px-3 py-2 text-slate-500">
                            {lead.email || "—"}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => removeLead(i)}
                              className="text-slate-400 hover:text-red-500"
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

          {/* Phone Numbers */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1">
                <Phone className="h-4 w-4 text-slate-500" />
                <Label className="text-base font-semibold">
                  Numéros de téléphone
                </Label>
              </div>
              <p className="mb-4 text-xs text-slate-500">
                Sélectionnez le numéro de téléphone à utiliser pour passer les
                appels sortants. Si plusieurs numéros sont sélectionnés, le
                système les sélectionnera pour passer des appels.
              </p>

              {phoneNumbers.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Aucun numéro de téléphone configuré.
                </p>
              ) : (
                <div className="space-y-2">
                  {phoneNumbers.map((pn) => (
                    <label
                      key={pn.id}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPhoneNumbers.includes(pn.id)}
                        onChange={() => togglePhone(pn.id)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm">{pn.number}</span>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Call Days */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-slate-500" />
                <Label className="text-base font-semibold">
                  Jours d&apos;appel
                </Label>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {DAYS.map((day) => (
                  <label
                    key={day.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={callDays.includes(day.value)}
                      onChange={() => toggleDay(day.value)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm">{day.label}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Call Hours + Timezone */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-slate-500" />
                <Label className="text-base font-semibold">
                  Heures d&apos;appels
                </Label>
              </div>
              <div className="flex items-center gap-3 mb-6">
                <Input
                  type="time"
                  value={callStartTime}
                  onChange={(e) => setCallStartTime(e.target.value)}
                  className="w-40"
                />
                <span className="text-slate-400">-</span>
                <Input
                  type="time"
                  value={callEndTime}
                  onChange={(e) => setCallEndTime(e.target.value)}
                  className="w-40"
                />
              </div>

              <Label className="text-base font-semibold">Fuseau horaire</Label>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                Auto: Appels effectués en fonction du fuseau horaire de chaque
                prospect.
                <br />
                Fixé: Appels effectués en fonction du fuseau horaire sélectionné.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Select value={timezoneMode} onValueChange={(v) => setTimezoneMode(v ?? "fixed")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixé</SelectItem>
                    <SelectItem value="auto">Auto</SelectItem>
                  </SelectContent>
                </Select>
                {timezoneMode === "fixed" && (
                  <Select value={timezone} onValueChange={(v) => setTimezone(v ?? "Europe/Paris")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez le fuseau horaire" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Retries */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <RotateCcw className="h-4 w-4 text-slate-500" />
                <Label className="text-base font-semibold">Tentatives</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-slate-600">
                    Nombre de nouvelles tentatives
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={maxRetries}
                    onChange={(e) => setMaxRetries(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-slate-600">
                    Intervalle de nouvelle tentative (heures)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={168}
                    value={retryIntervalH}
                    onChange={(e) => setRetryIntervalH(Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call Rate */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-slate-500" />
                <Label className="text-base font-semibold">
                  Taux d&apos;appel
                </Label>
              </div>
              <p className="mb-4 text-xs text-slate-500">
                Nombre d&apos;appels simultanés qui seront effectués par
                intervalle au cours de la progression de la campagne.
              </p>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={callRateCount}
                  onChange={(e) => setCallRateCount(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-slate-500">Appels /</span>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={callRateMinutes}
                  onChange={(e) => setCallRateMinutes(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-slate-500">Minutes</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Leads Preview */}
        <div>
          <Card className="sticky top-6">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-slate-900 mb-3">
                Aperçu des leads
              </h3>
              {leads.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="mx-auto h-10 w-10 text-slate-200" />
                  <p className="mt-2 text-sm text-slate-400">
                    Aucun lead importé
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-indigo-600">
                    {leads.length}
                  </p>
                  <p className="text-sm text-slate-500">leads à appeler</p>
                  <div className="mt-3 max-h-80 overflow-auto space-y-1">
                    {leads.slice(0, 50).map((lead, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm"
                      >
                        <span className="truncate">
                          {lead.name || lead.phone}
                        </span>
                        <span className="ml-2 text-xs text-slate-400">
                          {lead.phone}
                        </span>
                      </div>
                    ))}
                    {leads.length > 50 && (
                      <p className="text-center text-xs text-slate-400 pt-2">
                        + {leads.length - 50} autres leads
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex justify-end gap-3 border-t pt-6">
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
        >
          {isPending ? "Création..." : "Créer"}
        </Button>
      </div>
    </div>
  );
}
