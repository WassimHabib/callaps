"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentSettingsProps {
  agent: {
    id: string;
    name: string;
    description: string | null;
    systemPrompt: string;
    firstMessage: string | null;
    firstMessageMode: string;
    llmModel: string;
    voiceProvider: string;
    voiceId: string | null;
    voiceSpeed: number;
    voiceStability: number;
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
    published: boolean;
  };
}

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
    <div className="overflow-hidden rounded-xl border-0 bg-white shadow-sm">
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

export function AgentSettings({ agent }: AgentSettingsProps) {
  const [name, setName] = useState(agent.name);
  const [editingName, setEditingName] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(agent.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const action = (formData: FormData) => {
    formData.set("name", name);
    return updateAgent(agent.id, formData);
  };

  const handlePublish = () => publishAgent(agent.id);

  return (
    <form action={action}>
      {/* Top bar — Agent name + ID + Publish */}
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
                  <h1 className="text-xl font-semibold text-slate-900">
                    {name}
                  </h1>
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
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
              {agent.published ? (
                <Badge className="rounded-md border-0 bg-emerald-50 text-[10px] font-medium text-emerald-600">
                  Publié
                </Badge>
              ) : (
                <Badge className="rounded-md border-0 bg-amber-50 text-[10px] font-medium text-amber-600">
                  Brouillon
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="outline"
              className="rounded-xl border-slate-200 text-[13px]"
            >
              Sauvegarder
            </Button>
            <Button
              type="button"
              onClick={handlePublish}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-[13px] text-white shadow-lg shadow-indigo-500/25"
            >
              <Rocket className="mr-2 h-3.5 w-3.5" />
              Publier
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
              <SelectItem value="fr-FR">French</SelectItem>
              <SelectItem value="en-US">English (US)</SelectItem>
              <SelectItem value="en-GB">English (UK)</SelectItem>
              <SelectItem value="es-ES">Spanish</SelectItem>
              <SelectItem value="de-DE">German</SelectItem>
              <SelectItem value="ar-SA">Arabic</SelectItem>
              <SelectItem value="pt-BR">Portuguese</SelectItem>
              <SelectItem value="it-IT">Italian</SelectItem>
              <SelectItem value="nl-NL">Dutch</SelectItem>
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
                <SelectItem value="gpt-4.1">GPT 4.1</SelectItem>
                <SelectItem value="gpt-4.1-mini">GPT 4.1 Mini</SelectItem>
                <SelectItem value="gpt-4o">GPT 4o</SelectItem>
                <SelectItem value="claude-sonnet-4">Claude Sonnet 4</SelectItem>
                <SelectItem value="claude-haiku">Claude Haiku</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-5 w-px bg-slate-200" />

          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100">
              <Mic className="h-3 w-3 text-slate-500" />
            </div>
            <Select name="voiceId" defaultValue={agent.voiceId ?? "camille"}>
              <SelectTrigger className="h-9 w-[140px] rounded-lg border-slate-200 bg-slate-50 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="camille">Camille</SelectItem>
                <SelectItem value="sophie">Sophie</SelectItem>
                <SelectItem value="thomas">Thomas</SelectItem>
                <SelectItem value="lucas">Lucas</SelectItem>
                <SelectItem value="emma">Emma</SelectItem>
                <SelectItem value="james">James</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main content — Two columns */}
      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-[1fr_380px]">
        {/* Left — Prompt & First Message */}
        <div className="space-y-6">
          <Card className="border-0 bg-white shadow-sm">
            <CardContent className="p-6">
              <Label className="text-[13px] font-semibold text-slate-700">
                Invite système
              </Label>
              <Textarea
                name="systemPrompt"
                defaultValue={agent.systemPrompt}
                rows={20}
                placeholder={`[ROLE]\nTu es Sophie, conseillère commerciale...\n\n[CONTEXTE]\nTu travailles pour...\n\n[SERVICES PROPOSÉS]\n1. ...\n2. ...`}
                className="mt-2 rounded-xl border-slate-200 bg-slate-50 font-mono text-[13px] leading-relaxed transition-colors focus:bg-white"
              />
            </CardContent>
          </Card>

          <Card className="border-0 bg-white shadow-sm">
            <CardContent className="p-6">
              <Label className="text-[13px] font-semibold text-slate-700">
                Premier message
              </Label>
              <Select
                name="firstMessageMode"
                defaultValue={agent.firstMessageMode}
              >
                <SelectTrigger className="mt-2 h-10 rounded-xl border-slate-200 bg-slate-50 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dynamic">
                    AI Initiates: L&apos;IA commence avec un message dynamique
                  </SelectItem>
                  <SelectItem value="static">
                    AI Initiates: L&apos;IA commence avec un message fixe
                  </SelectItem>
                  <SelectItem value="user_first">
                    L&apos;utilisateur parle en premier
                  </SelectItem>
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

          {/* Description (hidden but sent) */}
          <input type="hidden" name="description" value={agent.description ?? ""} />
        </div>

        {/* Right — Accordion sections */}
        <div className="space-y-3">
          {/* Fonctions */}
          <AccordionSection icon={Settings2} title="Fonctions">
            <div className="space-y-3">
              <p className="text-[12px] text-slate-500">
                Définissez les fonctions que l&apos;agent peut appeler pendant un appel
                (prise de RDV, transfert, envoi SMS, etc.).
              </p>
              <Textarea
                name="functions_json"
                defaultValue={JSON.stringify(agent.functions, null, 2)}
                rows={6}
                placeholder='[{"name": "book_appointment", "description": "Prendre un RDV", "parameters": {...}}]'
                className="rounded-xl border-slate-200 bg-slate-50 font-mono text-[11px] transition-colors focus:bg-white"
              />
            </div>
          </AccordionSection>

          {/* Paramètres vocaux */}
          <AccordionSection icon={Mic} title="Paramètres vocaux">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[12px] text-slate-600">Provider</Label>
                <Select name="voiceProvider" defaultValue={agent.voiceProvider}>
                  <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-slate-50 text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                    <SelectItem value="openai">OpenAI TTS</SelectItem>
                    <SelectItem value="azure">Azure TTS</SelectItem>
                    <SelectItem value="deepgram">Deepgram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[12px] text-slate-600">Vitesse</Label>
                  <span className="text-[11px] text-slate-400">{agent.voiceSpeed}x</span>
                </div>
                <input
                  type="range"
                  name="voiceSpeed"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  defaultValue={agent.voiceSpeed}
                  className="w-full accent-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[12px] text-slate-600">Stabilité</Label>
                  <span className="text-[11px] text-slate-400">{Math.round(agent.voiceStability * 100)}%</span>
                </div>
                <input
                  type="range"
                  name="voiceStability"
                  min="0"
                  max="1"
                  step="0.05"
                  defaultValue={agent.voiceStability}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>
          </AccordionSection>

          {/* Transcription */}
          <AccordionSection icon={FileText} title="Paramètres de transcription en temps réel">
            <div className="space-y-3">
              <p className="text-[12px] text-slate-500">
                La transcription est automatiquement activée pour tous les appels.
                Les transcripts sont sauvegardés dans l&apos;historique des appels.
              </p>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <span className="text-[12px] text-slate-600">Transcription en temps réel</span>
                <Badge className="border-0 bg-emerald-50 text-[10px] text-emerald-600">Activé</Badge>
              </div>
            </div>
          </AccordionSection>

          {/* Paramètres d'appel */}
          <AccordionSection icon={Phone} title="Paramètres d'appel">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[12px] text-slate-600">
                  Durée max d&apos;appel (secondes)
                </Label>
                <Input
                  name="maxCallDuration"
                  type="number"
                  defaultValue={agent.maxCallDuration}
                  className="h-9 rounded-lg border-slate-200 bg-slate-50 text-[12px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[12px] text-slate-600">
                  Timeout silence (secondes)
                </Label>
                <Input
                  name="silenceTimeout"
                  type="number"
                  defaultValue={agent.silenceTimeout}
                  className="h-9 rounded-lg border-slate-200 bg-slate-50 text-[12px]"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-[12px] text-slate-600">
                  Raccrocher après silence
                </Label>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    name="endCallOnSilence"
                    defaultChecked={agent.endCallOnSilence}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-9 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-indigo-500 peer-checked:after:translate-x-full" />
                </label>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-[12px] text-slate-600">
                  Enregistrer les appels
                </Label>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    name="enableRecording"
                    defaultChecked={agent.enableRecording}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-9 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-indigo-500 peer-checked:after:translate-x-full" />
                </label>
              </div>
            </div>
          </AccordionSection>

          {/* Analyse post-appel */}
          <AccordionSection icon={BarChart3} title="Analyse post-appel">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-[12px] text-slate-600">
                  Activer l&apos;analyse post-appel
                </Label>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    name="postCallAnalysis"
                    defaultChecked={agent.postCallAnalysis}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-9 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-indigo-500 peer-checked:after:translate-x-full" />
                </label>
              </div>
              <div className="space-y-2">
                <Label className="text-[12px] text-slate-600">
                  Prompt d&apos;analyse
                </Label>
                <Textarea
                  name="postCallPrompt"
                  defaultValue={agent.postCallPrompt ?? ""}
                  rows={4}
                  placeholder="Analyse cet appel et extrais : le sentiment, le résultat, les prochaines étapes..."
                  className="rounded-lg border-slate-200 bg-slate-50 text-[12px] transition-colors focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[12px] text-slate-600">
                  Webhook post-appel
                </Label>
                <Input
                  name="postCallWebhook"
                  type="url"
                  defaultValue={agent.postCallWebhook ?? ""}
                  placeholder="https://votre-serveur.com/webhook"
                  className="h-9 rounded-lg border-slate-200 bg-slate-50 text-[12px]"
                />
              </div>
            </div>
          </AccordionSection>

          {/* Sécurité */}
          <AccordionSection icon={Shield} title="Paramètres de sécurité de secours">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[12px] text-slate-600">
                  Message de secours
                </Label>
                <Textarea
                  name="safetyMessage"
                  defaultValue={agent.safetyMessage ?? ""}
                  rows={3}
                  placeholder="En cas de problème technique, l'agent dira ce message avant de raccrocher."
                  className="rounded-lg border-slate-200 bg-slate-50 text-[12px] transition-colors focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[12px] text-slate-600">
                  Tentatives max avant secours
                </Label>
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

          {/* MCPs */}
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
