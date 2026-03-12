"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateAgent, publishAgent } from "@/app/(dashboard)/agents/actions";
import {
  Bell,
  Bot,
  Pencil,
  Copy,
  ChevronDown,
  Settings2,
  Mic,
  FileText,
  Phone,
  BarChart3,
  Shield,
  Plug,
  Rocket,
  Check,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceSelector } from "@/components/agents/voice-selector";
import { FunctionEditor, type AgentFunction } from "@/components/agents/function-editor";
import { WebCallButton } from "@/components/agents/web-call-button";

// ─── Types ───────────────────────────────────────────────────
interface AgentConfig {
  backgroundSound?: string;
  responsiveness?: number;
  interruptSensitivity?: number;
  enableBackchanneling?: boolean;
  enableSpeechNormalization?: boolean;
  reminderFrequencySec?: number;
  reminderMaxCount?: number;
  pronunciations?: { word: string; pronunciation: string }[];
  denoiseMode?: string;
  transcriptionMode?: string;
  vocabularySpecialization?: string;
  boostedKeywords?: string;
  voicemailDetection?: boolean;
  keypadInputDetection?: boolean;
  keypadTimeout?: number;
  keypadTerminationKey?: string;
  keypadDigitLimit?: number;
  pauseBeforeSpeaking?: number;
  ringDuration?: number;
  postCallModel?: string;
  dataStoragePolicy?: string;
  piiRedaction?: boolean;
  secureUrls?: boolean;
  fallbackVoiceId?: string;
}

interface AgentSettingsProps {
  agent: {
    id: string;
    name: string;
    description: string | null;
    systemPrompt: string;
    firstMessage: string | null;
    firstMessageMode: string;
    llmModel: string;
    voiceId: string | null;
    voiceSpeed: number;
    voiceTemperature: number;
    language: string;
    maxCallDuration: number;
    silenceTimeout: number;
    endCallOnSilence: boolean;
    enableRecording: boolean;
    postCallAnalysis: boolean;
    postCallPrompt: string | null;
    postCallWebhook: string | null;
    safetyMessage: string | null;
    maxSafetyRetries: number;
    functions: unknown;
    mcpConfig: unknown;
    config: unknown;
    notificationEmail: string | null;
    notificationPhone: string | null;
    published: boolean;
    retellAgentId: string | null;
  };
}

// ─── Reusable UI pieces ──────────────────────────────────────
function AccordionSection({
  icon: Icon,
  title,
  children,
  defaultOpen = false,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border-0 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
            <Icon className="h-4 w-4 text-slate-600" />
          </div>
          <span className="text-[13px] font-semibold text-slate-900">
            {title}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="border-t border-slate-100 p-4 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

function SliderField({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step,
  minLabel,
  maxLabel,
  formatValue,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  minLabel?: string;
  maxLabel?: string;
  formatValue?: (v: number) => string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[12px] font-medium text-slate-700">{label}</Label>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      {description && (
        <p className="text-[11px] text-slate-400">{description}</p>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-500"
      />
      {(minLabel || maxLabel) && (
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Label className="text-[12px] font-medium text-slate-700">{label}</Label>
          {description && (
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{description}</p>
          )}
        </div>
        <label className="relative ml-3 inline-flex shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="peer sr-only"
          />
          <div className="h-5 w-9 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-indigo-500 peer-checked:after:translate-x-full" />
        </label>
      </div>
    </div>
  );
}

function RadioField({
  label,
  description,
  options,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[12px] font-medium text-slate-700">{label}</Label>
      {description && (
        <p className="text-[11px] text-slate-400">{description}</p>
      )}
      <div className="space-y-2">
        {options.map((opt) => (
          <label key={opt.value} className="flex cursor-pointer items-center gap-2.5">
            <input
              type="radio"
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="h-4 w-4 border-slate-300 accent-indigo-500"
            />
            <span className="text-[12px] text-slate-700">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────
export function AgentSettings({ agent }: AgentSettingsProps) {
  const [name, setName] = useState(agent.name);
  const [editingName, setEditingName] = useState(false);
  const [copied, setCopied] = useState(false);
  const [voiceId, setVoiceId] = useState(agent.voiceId ?? "minimax-Camille");
  const [isSaving, startSaveTransition] = useTransition();
  const [isPublishing, startPublishTransition] = useTransition();
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [agentFunctions, setAgentFunctions] = useState<AgentFunction[]>(() => {
    if (Array.isArray(agent.functions)) return agent.functions as AgentFunction[];
    return [];
  });

  // Parse config
  const initialConfig: AgentConfig = (typeof agent.config === "object" && agent.config !== null)
    ? (agent.config as AgentConfig)
    : {};

  // Voice params state
  const [voiceSpeed, setVoiceSpeed] = useState(agent.voiceSpeed);
  const [voiceTemperature, setVoiceTemperature] = useState(agent.voiceTemperature);
  const [backgroundSound, setBackgroundSound] = useState(initialConfig.backgroundSound ?? "none");
  const [responsiveness, setResponsiveness] = useState(initialConfig.responsiveness ?? 0.5);
  const [interruptSensitivity, setInterruptSensitivity] = useState(initialConfig.interruptSensitivity ?? 0.9);
  const [enableBackchanneling, setEnableBackchanneling] = useState(initialConfig.enableBackchanneling ?? false);
  const [enableSpeechNormalization, setEnableSpeechNormalization] = useState(initialConfig.enableSpeechNormalization ?? false);
  const [reminderFrequencySec, setReminderFrequencySec] = useState(initialConfig.reminderFrequencySec ?? 10);
  const [reminderMaxCount, setReminderMaxCount] = useState(initialConfig.reminderMaxCount ?? 1);
  const [pronunciations, setPronunciations] = useState<{ word: string; pronunciation: string }[]>(
    initialConfig.pronunciations ?? []
  );

  // Transcription state
  const [denoiseMode, setDenoiseMode] = useState(initialConfig.denoiseMode ?? "noise");
  const [transcriptionMode, setTranscriptionMode] = useState(initialConfig.transcriptionMode ?? "speed");
  const [vocabularySpecialization, setVocabularySpecialization] = useState(initialConfig.vocabularySpecialization ?? "general");
  const [boostedKeywords, setBoostedKeywords] = useState(initialConfig.boostedKeywords ?? "");

  // Call settings state
  const [maxCallDuration, setMaxCallDuration] = useState(agent.maxCallDuration);
  const [silenceTimeout, setSilenceTimeout] = useState(agent.silenceTimeout);
  const [endCallOnSilence, setEndCallOnSilence] = useState(agent.endCallOnSilence);
  const [enableRecording, setEnableRecording] = useState(agent.enableRecording);
  const [voicemailDetection, setVoicemailDetection] = useState(initialConfig.voicemailDetection ?? false);
  const [keypadInputDetection, setKeypadInputDetection] = useState(initialConfig.keypadInputDetection ?? true);
  const [keypadTimeout, setKeypadTimeout] = useState(initialConfig.keypadTimeout ?? 5);
  const [keypadTerminationKey, setKeypadTerminationKey] = useState(initialConfig.keypadTerminationKey ?? "#");
  const [keypadDigitLimit, setKeypadDigitLimit] = useState(initialConfig.keypadDigitLimit ?? 5);
  const [pauseBeforeSpeaking, setPauseBeforeSpeaking] = useState(initialConfig.pauseBeforeSpeaking ?? 0);
  const [ringDuration, setRingDuration] = useState(initialConfig.ringDuration ?? 30);

  // Post-call state
  const [postCallAnalysis, setPostCallAnalysis] = useState(agent.postCallAnalysis);
  const [postCallModel, setPostCallModel] = useState(initialConfig.postCallModel ?? "gpt-4.1-mini");

  // Security state
  const [dataStoragePolicy, setDataStoragePolicy] = useState(initialConfig.dataStoragePolicy ?? "all");
  const [piiRedaction, setPiiRedaction] = useState(initialConfig.piiRedaction ?? false);
  const [secureUrls, setSecureUrls] = useState(initialConfig.secureUrls ?? false);

  const handleVoiceSelect = (id: string, _provider: string) => {
    setVoiceId(id);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(agent.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Build config JSON from all advanced settings
  const buildConfig = (): AgentConfig => ({
    backgroundSound,
    responsiveness,
    interruptSensitivity,
    enableBackchanneling,
    enableSpeechNormalization,
    reminderFrequencySec,
    reminderMaxCount,
    pronunciations,
    denoiseMode,
    transcriptionMode,
    vocabularySpecialization,
    boostedKeywords,
    voicemailDetection,
    keypadInputDetection,
    keypadTimeout,
    keypadTerminationKey,
    keypadDigitLimit,
    pauseBeforeSpeaking,
    ringDuration,
    postCallModel,
    dataStoragePolicy,
    piiRedaction,
    secureUrls,
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const buildFormData = (formData: FormData) => {
    formData.set("name", name);
    formData.set("voiceSpeed", String(voiceSpeed));
    formData.set("voiceTemperature", String(voiceTemperature));
    formData.set("maxCallDuration", String(maxCallDuration));
    formData.set("silenceTimeout", String(silenceTimeout));
    formData.set("endCallOnSilence", endCallOnSilence ? "true" : "false");
    formData.set("enableRecording", enableRecording ? "true" : "false");
    formData.set("postCallAnalysis", postCallAnalysis ? "true" : "false");
    formData.set("config_json", JSON.stringify(buildConfig()));
    return formData;
  };

  const action = (formData: FormData) => {
    startSaveTransition(async () => {
      try {
        await updateAgent(agent.id, buildFormData(formData));
        showToast("success", "Agent sauvegardé avec succès");
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
      }
    });
  };

  const handlePublish = () => {
    startPublishTransition(async () => {
      try {
        const form = document.querySelector("form");
        if (form) {
          const formData = new FormData(form);
          await updateAgent(agent.id, buildFormData(formData));
        }
        await publishAgent(agent.id);
        showToast("success", "Agent publié avec succès sur Retell");
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Erreur lors de la publication");
      }
    });
  };

  const formatDuration = (sec: number) => {
    if (sec >= 3600) return `${Math.round(sec / 3600)}h`;
    if (sec >= 60) return `${Math.round(sec / 60)}m`;
    return `${sec}s`;
  };

  return (
    <form action={action} className="relative">
      {/* Toast notification */}
      {toast && (
        <div
          className={cn(
            "fixed top-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all animate-in slide-in-from-top-2",
            toast.type === "success"
              ? "bg-emerald-500 text-white"
              : "bg-red-500 text-white"
          )}
        >
          {toast.type === "success" ? (
            <Check className="h-4 w-4" />
          ) : (
            <span className="h-4 w-4 text-center font-bold">!</span>
          )}
          {toast.message}
        </div>
      )}
      {/* Top bar */}
      <div className="border-b border-slate-100 bg-white/80 px-8 py-5 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              {editingName ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setEditingName(false)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
                  autoFocus
                  className="border-b-2 border-indigo-500 bg-transparent text-xl font-semibold text-slate-900 outline-none"
                />
              ) : (
                <>
                  <h1 className="text-xl font-semibold text-slate-900">{name}</h1>
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[11px] text-slate-400">
                Agent ID: {agent.id.slice(0, 8)}...{agent.id.slice(-4)}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="rounded p-0.5 text-slate-400 transition-colors hover:text-slate-600"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              </button>
              {agent.published ? (
                <Badge className="rounded-md border-0 bg-emerald-50 text-[10px] font-medium text-emerald-600">Publié</Badge>
              ) : (
                <Badge className="rounded-md border-0 bg-amber-50 text-[10px] font-medium text-amber-600">Brouillon</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {agent.published && agent.retellAgentId && (
              <WebCallButton agentId={agent.id} />
            )}
            <Button
              type="submit"
              variant="outline"
              className="rounded-xl border-slate-200 text-[13px]"
              disabled={isSaving || isPublishing}
            >
              {isSaving ? (
                <>
                  <span className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                  Sauvegarde...
                </>
              ) : (
                "Sauvegarder"
              )}
            </Button>
            <Button
              type="button"
              onClick={handlePublish}
              disabled={isSaving || isPublishing}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-[13px] text-white shadow-lg shadow-indigo-500/25"
            >
              {isPublishing ? (
                <>
                  <span className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Publication...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-3.5 w-3.5" />
                  Publier
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Quick settings bar */}
      <div className="border-b border-slate-100 bg-white px-8 py-3">
        <div className="flex items-center gap-3">
          <Select name="language" defaultValue={agent.language}>
            <SelectTrigger className="h-9 w-[130px] rounded-lg border-slate-200 bg-slate-50 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fr-FR">Français</SelectItem>
              <SelectItem value="en-US">English (US)</SelectItem>
              <SelectItem value="en-GB">English (UK)</SelectItem>
              <SelectItem value="es-ES">Español</SelectItem>
              <SelectItem value="de-DE">Deutsch</SelectItem>
              <SelectItem value="ar-SA">العربية</SelectItem>
              <SelectItem value="tr-TR">Türkçe</SelectItem>
              <SelectItem value="pt-BR">Português</SelectItem>
              <SelectItem value="it-IT">Italiano</SelectItem>
              <SelectItem value="nl-NL">Nederlands</SelectItem>
              <SelectItem value="pl-PL">Polski</SelectItem>
              <SelectItem value="ru-RU">Русский</SelectItem>
              <SelectItem value="ja-JP">日本語</SelectItem>
              <SelectItem value="zh-CN">中文</SelectItem>
              <SelectItem value="ko-KR">한국어</SelectItem>
            </SelectContent>
          </Select>

          <div className="h-5 w-px bg-slate-200" />

          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100">
              <Bot className="h-3 w-3 text-slate-500" />
            </div>
            <Select name="llmModel" defaultValue={agent.llmModel}>
              <SelectTrigger className="h-9 w-[140px] rounded-lg border-slate-200 bg-slate-50 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-5">GPT 5</SelectItem>
                <SelectItem value="gpt-4.1">GPT 4.1</SelectItem>
                <SelectItem value="gpt-4.1-mini">GPT 4.1 Mini</SelectItem>
                <SelectItem value="gpt-4.1-nano">GPT 4.1 Nano</SelectItem>
                <SelectItem value="gpt-4o">GPT 4o</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT 4o Mini</SelectItem>
                <SelectItem value="o3">o3</SelectItem>
                <SelectItem value="o3-mini">o3 Mini</SelectItem>
                <SelectItem value="o4-mini">o4 Mini</SelectItem>
                <SelectItem value="claude-opus-4">Claude Opus 4</SelectItem>
                <SelectItem value="claude-sonnet-4">Claude Sonnet 4</SelectItem>
                <SelectItem value="claude-haiku-4">Claude Haiku 4</SelectItem>
                <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                <SelectItem value="deepseek-v3">DeepSeek V3</SelectItem>
                <SelectItem value="groq-llama-4-scout">Llama 4 Scout (Groq)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-5 w-px bg-slate-200" />

          <div className="w-[200px]">
            <VoiceSelector value={voiceId} provider="" onSelect={handleVoiceSelect} />
          </div>
          <input type="hidden" name="voiceId" value={voiceId} />
        </div>
      </div>

      {/* Main content — Two columns */}
      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-[1fr_380px]">
        {/* Left — Prompt & First Message */}
        <div className="space-y-6">
          <Card className="border-0 bg-white shadow-sm">
            <CardContent className="p-6">
              <Label className="text-[13px] font-semibold text-slate-700">Invite système</Label>
              <Textarea
                name="systemPrompt"
                defaultValue={agent.systemPrompt}
                rows={32}
                placeholder={`[ROLE]\nTu es Sophie, conseillère commerciale...\n\n[CONTEXTE]\nTu travailles pour...\n\n[SERVICES PROPOSÉS]\n1. ...\n2. ...`}
                className="mt-2 min-h-[500px] rounded-xl border-slate-200 bg-slate-50 font-mono text-[13px] leading-relaxed transition-colors focus:bg-white"
              />
            </CardContent>
          </Card>

          <Card className="border-0 bg-white shadow-sm">
            <CardContent className="p-6">
              <Label className="text-[13px] font-semibold text-slate-700">Premier message</Label>
              <Select name="firstMessageMode" defaultValue={agent.firstMessageMode}>
                <SelectTrigger className="mt-2 h-10 w-full rounded-xl border-slate-200 bg-slate-50 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="w-[var(--anchor-width)]">
                  <SelectItem value="dynamic">IA dynamique — génère le premier message</SelectItem>
                  <SelectItem value="static">IA fixe — utilise le message ci-dessous</SelectItem>
                  <SelectItem value="user_first">L&apos;utilisateur parle en premier</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                name="firstMessage"
                defaultValue={agent.firstMessage ?? ""}
                rows={3}
                placeholder="Message de début personnalisé (optionnel si mode dynamique)"
                className="mt-3 rounded-xl border-slate-200 bg-slate-50 text-[13px] transition-colors focus:bg-white"
              />
            </CardContent>
          </Card>

          <input type="hidden" name="description" value={agent.description ?? ""} />
        </div>

        {/* Right — Accordion sections */}
        <div className="space-y-3">
          {/* ── Fonctions ── */}
          <AccordionSection icon={Settings2} title="Fonctions">
            <FunctionEditor functions={agentFunctions} onChange={setAgentFunctions} />
            <input type="hidden" name="functions_json" value={JSON.stringify(agentFunctions)} />
          </AccordionSection>

          {/* ── Paramètres vocaux ── */}
          <AccordionSection icon={Mic} title="Paramètres vocaux">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[12px] font-medium text-slate-700">Voix sélectionnée</Label>
                <VoiceSelector value={voiceId} provider="" onSelect={handleVoiceSelect} />
              </div>

              <div className="space-y-2">
                <Label className="text-[12px] font-medium text-slate-700">Son de fond</Label>
                <Select value={backgroundSound} onValueChange={(v) => setBackgroundSound(v ?? "none")}>
                  <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-slate-50 text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    <SelectItem value="office">Bureau</SelectItem>
                    <SelectItem value="cafe">Café</SelectItem>
                    <SelectItem value="nature">Nature</SelectItem>
                    <SelectItem value="city">Ville</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <SliderField
                label="Réactivité"
                description="Contrôlez la vitesse à laquelle l'agent répond une fois que les utilisateurs ont fini de parler."
                value={responsiveness}
                onChange={setResponsiveness}
                min={0} max={1} step={0.01}
                minLabel="Lent" maxLabel="Rapide"
                formatValue={(v) => v.toFixed(2)}
              />

              <SliderField
                label="Sensibilité aux interruptions"
                description="Contrôlez la sensibilité avec laquelle l'IA peut être interrompue par la parole humaine."
                value={interruptSensitivity}
                onChange={setInterruptSensitivity}
                min={0} max={1} step={0.01}
                minLabel="Faible" maxLabel="Haut"
                formatValue={(v) => v.toFixed(2)}
              />

              <ToggleField
                label="Activer le backchanneling"
                description="Permet à l'agent d'utiliser des affirmations telles que « ouais » ou « uh-huh » pendant les conversations, indiquant une écoute active."
                checked={enableBackchanneling}
                onChange={setEnableBackchanneling}
              />

              <ToggleField
                label="Activer la normalisation de la parole"
                description="Convertit des éléments textuels tels que des nombres, des devises et des dates en formes vocales proches de celles de l'humain."
                checked={enableSpeechNormalization}
                onChange={setEnableSpeechNormalization}
              />

              <div className="space-y-2">
                <Label className="text-[12px] font-medium text-slate-700">Fréquence des messages de rappel</Label>
                <p className="text-[11px] text-slate-400">
                  Contrôlez la fréquence à laquelle l&apos;IA enverra un message de rappel.
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      value={reminderFrequencySec}
                      onChange={(e) => setReminderFrequencySec(Number(e.target.value))}
                      className="h-8 w-[70px] rounded-lg border-slate-200 bg-slate-50 text-[12px]"
                    />
                    <span className="text-[11px] text-slate-400">secondes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      value={reminderMaxCount}
                      onChange={(e) => setReminderMaxCount(Number(e.target.value))}
                      className="h-8 w-[70px] rounded-lg border-slate-200 bg-slate-50 text-[12px]"
                    />
                    <span className="text-[11px] text-slate-400">fois</span>
                  </div>
                </div>
              </div>

              <SliderField
                label="Vitesse"
                value={voiceSpeed}
                onChange={setVoiceSpeed}
                min={0.5} max={2.0} step={0.1}
                minLabel="0.5x" maxLabel="2x"
                formatValue={(v) => `${v.toFixed(1)}x`}
              />

              <SliderField
                label="Température"
                value={voiceTemperature}
                onChange={setVoiceTemperature}
                min={0} max={1} step={0.05}
                minLabel="Variable" maxLabel="Stable"
                formatValue={(v) => `${Math.round(v * 100)}%`}
              />

              {/* Pronunciation */}
              <div className="space-y-2">
                <Label className="text-[12px] font-medium text-slate-700">Prononciation</Label>
                <p className="text-[11px] text-slate-400">
                  Guidez le modèle pour qu&apos;il prononce un mot, un nom ou une phrase d&apos;une manière spécifique.
                </p>
                {pronunciations.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={p.word}
                      onChange={(e) => {
                        const next = [...pronunciations];
                        next[i] = { ...next[i], word: e.target.value };
                        setPronunciations(next);
                      }}
                      placeholder="Mot"
                      className="h-8 flex-1 rounded-lg border-slate-200 bg-slate-50 text-[12px]"
                    />
                    <Input
                      value={p.pronunciation}
                      onChange={(e) => {
                        const next = [...pronunciations];
                        next[i] = { ...next[i], pronunciation: e.target.value };
                        setPronunciations(next);
                      }}
                      placeholder="Prononciation"
                      className="h-8 flex-1 rounded-lg border-slate-200 bg-slate-50 text-[12px]"
                    />
                    <button
                      type="button"
                      onClick={() => setPronunciations(pronunciations.filter((_, j) => j !== i))}
                      className="rounded p-1 text-slate-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setPronunciations([...pronunciations, { word: "", pronunciation: "" }])}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Plus className="h-3 w-3" /> Ajouter
                </button>
              </div>
            </div>
          </AccordionSection>

          {/* ── Transcription ── */}
          <AccordionSection icon={FileText} title="Paramètres de transcription en temps réel">
            <div className="space-y-5">
              <RadioField
                label="Mode de débruitage"
                description="Filtrer les bruits de fond ou les paroles indésirables."
                options={[
                  { value: "noise", label: "Supprimer le bruit" },
                  { value: "noise_and_speech", label: "Suppression du bruit et de la parole en arrière-plan" },
                ]}
                value={denoiseMode}
                onChange={setDenoiseMode}
              />

              <RadioField
                label="Mode de transcription"
                description="Équilibre entre vitesse et précision."
                options={[
                  { value: "speed", label: "Optimiser pour la vitesse" },
                  { value: "accuracy", label: "Optimiser pour la précision" },
                ]}
                value={transcriptionMode}
                onChange={setTranscriptionMode}
              />

              <RadioField
                label="Spécialisation du vocabulaire"
                description="Choisissez le vocabulaire à utiliser pour la transcription."
                options={[
                  { value: "general", label: "Général (Fonctionne bien dans la plupart des secteurs)" },
                  { value: "medical", label: "Médical (Optimisé pour les termes liés aux soins de santé)" },
                ]}
                value={vocabularySpecialization}
                onChange={setVocabularySpecialization}
              />

              <div className="space-y-2">
                <Label className="text-[12px] font-medium text-slate-700">Mots clés boostés</Label>
                <p className="text-[11px] text-slate-400">
                  Fournissez une liste personnalisée de mots-clés pour enrichir le vocabulaire de nos modèles.
                </p>
                <Input
                  value={boostedKeywords}
                  onChange={(e) => setBoostedKeywords(e.target.value)}
                  placeholder="Séparez les mots-clés par des virgules (ex: Wevlap,CRM,calendrier)"
                  className="h-9 rounded-lg border-slate-200 bg-slate-50 text-[12px]"
                />
              </div>
            </div>
          </AccordionSection>

          {/* ── Paramètres d'appel ── */}
          <AccordionSection icon={Phone} title="Paramètres d'appel">
            <div className="space-y-5">
              <ToggleField
                label="Détection de messagerie vocale"
                description="Raccrochez ou laissez un message vocal si un message vocal est détecté."
                checked={voicemailDetection}
                onChange={setVoicemailDetection}
              />

              <ToggleField
                label="Détection de saisie du clavier utilisateur"
                description="Permettez à l'IA d'écouter les entrées du clavier pendant un appel."
                checked={keypadInputDetection}
                onChange={setKeypadInputDetection}
              />

              {keypadInputDetection && (
                <div className="space-y-4 rounded-lg bg-slate-50 p-3">
                  <SliderField
                    label="Temps mort"
                    description="L'IA répondra si aucune entrée au clavier n'est détectée dans le délai défini."
                    value={keypadTimeout}
                    onChange={setKeypadTimeout}
                    min={1} max={15} step={1}
                    minLabel="1s" maxLabel="15s"
                    formatValue={(v) => `${v}s`}
                  />

                  <div className="space-y-2">
                    <Label className="text-[12px] font-medium text-slate-700">Clé de terminaison</Label>
                    <p className="text-[11px] text-slate-400">
                      L&apos;IA répondra lorsque l&apos;utilisateur appuiera sur la touche de terminaison configurée.
                    </p>
                    <Select value={keypadTerminationKey} onValueChange={(v) => setKeypadTerminationKey(v ?? "#")}>
                      <SelectTrigger className="h-9 w-[80px] rounded-lg border-slate-200 bg-white text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["#", "*", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => (
                          <SelectItem key={k} value={k}>{k}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <SliderField
                    label="Limite de chiffres"
                    description="L'IA répondra immédiatement après que l'appelant aura saisi le nombre de chiffres configuré."
                    value={keypadDigitLimit}
                    onChange={setKeypadDigitLimit}
                    min={1} max={50} step={1}
                    minLabel="1" maxLabel="50"
                  />
                </div>
              )}

              <SliderField
                label="Fin d'appel après un silence"
                value={silenceTimeout}
                onChange={setSilenceTimeout}
                min={10} max={1800} step={10}
                minLabel="10s" maxLabel="30m"
                formatValue={formatDuration}
              />

              <SliderField
                label="Durée maximale de l'appel"
                value={maxCallDuration}
                onChange={setMaxCallDuration}
                min={60} max={7200} step={60}
                minLabel="1m" maxLabel="2h"
                formatValue={formatDuration}
              />

              <SliderField
                label="Faites une pause avant de parler"
                description="La durée avant que l'assistant ne commence à parler au début de l'appel."
                value={pauseBeforeSpeaking}
                onChange={setPauseBeforeSpeaking}
                min={0} max={5} step={1}
                minLabel="0s" maxLabel="5s"
                formatValue={(v) => `${v}s`}
              />

              <SliderField
                label="Durée de la sonnerie"
                description="La durée maximale de sonnerie avant que l'appel sortant ne soit considéré comme une non-réponse."
                value={ringDuration}
                onChange={setRingDuration}
                min={5} max={90} step={5}
                minLabel="5s" maxLabel="1.5m"
                formatValue={(v) => `${v}s`}
              />

              <ToggleField
                label="Raccrocher après silence"
                checked={endCallOnSilence}
                onChange={setEndCallOnSilence}
              />

              <ToggleField
                label="Enregistrer les appels"
                checked={enableRecording}
                onChange={setEnableRecording}
              />
            </div>
          </AccordionSection>

          {/* ── Analyse post-appel ── */}
          <AccordionSection icon={BarChart3} title="Analyse post-appel">
            <div className="space-y-4">
              <p className="text-[12px] text-slate-500">
                Définissez les informations que vous devez extraire de la voix.
              </p>

              <ToggleField
                label="Activer l'analyse post-appel"
                checked={postCallAnalysis}
                onChange={setPostCallAnalysis}
              />

              {postCallAnalysis && (
                <>
                  <div className="space-y-2">
                    <Label className="text-[12px] font-medium text-slate-700">Modèle d&apos;analyse post-appel</Label>
                    <Select value={postCallModel} onValueChange={(v) => setPostCallModel(v ?? "gpt-4.1-mini")}>
                      <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-slate-50 text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4.1-mini">GPT 4.1 Mini</SelectItem>
                        <SelectItem value="gpt-4.1">GPT 4.1</SelectItem>
                        <SelectItem value="gpt-4o">GPT 4o</SelectItem>
                        <SelectItem value="claude-sonnet-4">Claude Sonnet 4</SelectItem>
                        <SelectItem value="claude-haiku-4">Claude Haiku 4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[12px] font-medium text-slate-700">Prompt d&apos;analyse</Label>
                    <Textarea
                      name="postCallPrompt"
                      defaultValue={agent.postCallPrompt ?? ""}
                      rows={4}
                      placeholder="Analyse cet appel et extrais : le sentiment, le résultat, les prochaines étapes..."
                      className="rounded-lg border-slate-200 bg-slate-50 text-[12px] transition-colors focus:bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[12px] font-medium text-slate-700">Webhook post-appel</Label>
                    <Input
                      name="postCallWebhook"
                      type="url"
                      defaultValue={agent.postCallWebhook ?? ""}
                      placeholder="https://votre-serveur.com/webhook"
                      className="h-9 rounded-lg border-slate-200 bg-slate-50 text-[12px]"
                    />
                  </div>
                </>
              )}
            </div>
          </AccordionSection>

          {/* ── Sécurité ── */}
          <AccordionSection icon={Shield} title="Paramètres de sécurité de secours">
            <div className="space-y-5">
              <RadioField
                label="Paramètres de stockage des données"
                description="Choisissez comment nous stockons les données sensibles."
                options={[
                  { value: "all", label: "Tout" },
                  { value: "no_pii", label: "Tout sauf les données personnelles identifiables" },
                  { value: "basic", label: "Attributs de base uniquement" },
                ]}
                value={dataStoragePolicy}
                onChange={setDataStoragePolicy}
              />

              <ToggleField
                label="Rédaction des informations personnelles (PII)"
                description="Ne masquez que les catégories spécifiques de données sensibles que vous choisissez, tout en préservant les autres enregistrements d'appels."
                checked={piiRedaction}
                onChange={setPiiRedaction}
              />

              <ToggleField
                label="URL sécurisées"
                description="Ajoutez des signatures de sécurité aux URL. Les URL expirent après 24 heures."
                checked={secureUrls}
                onChange={setSecureUrls}
              />

              <div className="space-y-2">
                <Label className="text-[12px] font-medium text-slate-700">Message de secours</Label>
                <Textarea
                  name="safetyMessage"
                  defaultValue={agent.safetyMessage ?? ""}
                  rows={3}
                  placeholder="En cas de problème technique, l'agent dira ce message avant de raccrocher."
                  className="rounded-lg border-slate-200 bg-slate-50 text-[12px] transition-colors focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[12px] font-medium text-slate-700">Tentatives max avant secours</Label>
                <Input
                  name="maxSafetyRetries"
                  type="number"
                  defaultValue={agent.maxSafetyRetries}
                  min={1}
                  max={10}
                  className="h-9 rounded-lg border-slate-200 bg-slate-50 text-[12px]"
                />
              </div>
            </div>
          </AccordionSection>

          {/* ── Notifications ── */}
          <AccordionSection icon={Bell} title="Notifications">
            <div className="space-y-5">
              <p className="text-[12px] text-slate-500">
                Configurez ou envoyer les notifications et recapitulatifs d&apos;appel,
                et le numero a contacter pour les transferts.
              </p>
              <div className="space-y-2">
                <Label className="text-[12px] font-medium text-slate-700">Email de notification</Label>
                <Input
                  name="notificationEmail"
                  type="email"
                  defaultValue={agent.notificationEmail ?? ""}
                  placeholder="contact@entreprise.fr"
                  className="h-9 rounded-lg border-slate-200 bg-slate-50 text-[12px]"
                />
                <p className="text-[11px] text-slate-400">
                  Les recapitulatifs d&apos;appel seront envoyes a cette adresse.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-[12px] font-medium text-slate-700">Telephone de notification</Label>
                <Input
                  name="notificationPhone"
                  type="tel"
                  defaultValue={agent.notificationPhone ?? ""}
                  placeholder="+33612345678"
                  className="h-9 rounded-lg border-slate-200 bg-slate-50 text-[12px]"
                />
                <p className="text-[11px] text-slate-400">
                  Numero utilise pour les transferts d&apos;appel vers un commercial ou responsable.
                </p>
              </div>
            </div>
          </AccordionSection>

          {/* ── MCPs ── */}
          <AccordionSection icon={Plug} title="MCPs">
            <div className="space-y-3">
              <p className="text-[12px] text-slate-500">
                Connectez des Model Context Protocols pour donner à votre agent
                l&apos;accès à des outils externes (CRM, calendrier, base de données...).
              </p>
              <Textarea
                name="mcp_json"
                defaultValue={JSON.stringify(agent.mcpConfig, null, 2)}
                rows={6}
                placeholder='[{"name": "google-calendar", "url": "...", "tools": [...]}]'
                className="rounded-xl border-slate-200 bg-slate-50 font-mono text-[11px] transition-colors focus:bg-white"
              />
            </div>
          </AccordionSection>
        </div>
      </div>
    </form>
  );
}
