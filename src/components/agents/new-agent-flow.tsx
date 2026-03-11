"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { ArrowLeft, Bot, Sparkles, Building2 } from "lucide-react";
import { createAgent } from "@/app/(dashboard)/agents/actions";
import {
  AGENT_TEMPLATES,
  TEMPLATE_CATEGORIES,
  applyCompanyToTemplate,
  type AgentTemplate,
  type TemplateCategory,
  type CompanyInfo,
} from "@/lib/agent-templates";
import { getCompanyProfile } from "@/app/(dashboard)/settings/actions";
import { TemplateCard, BlankTemplateCard } from "./template-card";

export function NewAgentFlow() {
  const [step, setStep] = useState<"templates" | "form">("templates");
  const [selectedTemplate, setSelectedTemplate] =
    useState<AgentTemplate | null>(null);
  const [selectedBlank, setSelectedBlank] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<CompanyInfo | null>(null);

  useEffect(() => {
    getCompanyProfile().then((profile) => {
      if (profile) setCompanyProfile(profile);
    });
  }, []);

  function handleSelectTemplate(template: AgentTemplate) {
    setSelectedTemplate(template);
    setSelectedBlank(false);
  }

  function handleSelectBlank() {
    setSelectedTemplate(null);
    setSelectedBlank(true);
  }

  function handleContinue() {
    if (selectedTemplate || selectedBlank) {
      setStep("form");
    }
  }

  function handleBack() {
    setStep("templates");
  }

  if (step === "form") {
    return (
      <AgentCreationForm
        template={selectedTemplate}
        companyProfile={companyProfile}
        onBack={handleBack}
      />
    );
  }

  return <TemplateSelection
    selectedTemplate={selectedTemplate}
    selectedBlank={selectedBlank}
    onSelectTemplate={handleSelectTemplate}
    onSelectBlank={handleSelectBlank}
    onContinue={handleContinue}
    hasCompanyProfile={companyProfile !== null}
  />;
}

// ---------- Step 1: Template Selection ----------

interface TemplateSelectionProps {
  selectedTemplate: AgentTemplate | null;
  selectedBlank: boolean;
  onSelectTemplate: (t: AgentTemplate) => void;
  onSelectBlank: () => void;
  onContinue: () => void;
  hasCompanyProfile?: boolean;
}

function TemplateSelection({
  selectedTemplate,
  selectedBlank,
  onSelectTemplate,
  onSelectBlank,
  onContinue,
  hasCompanyProfile,
}: TemplateSelectionProps) {
  const categories = Object.keys(TEMPLATE_CATEGORIES) as TemplateCategory[];
  const hasSelection = selectedTemplate !== null || selectedBlank;

  return (
    <div className="mx-auto max-w-6xl p-8">
      {/* Hero section */}
      <div className="mb-10 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-[13px] font-medium text-indigo-600">
          <Sparkles className="h-3.5 w-3.5" />
          Templates professionnels
        </div>
        <h2 className="mb-2 text-2xl font-bold text-slate-900">
          Choisissez un modele pour demarrer
        </h2>
        <p className="mx-auto max-w-xl text-[15px] text-slate-500">
          Selectionnez un template pre-configure avec un prompt professionnel, ou
          partez d&apos;un agent vierge. Vous pourrez tout personnaliser ensuite.
        </p>
      </div>

      {/* Company profile banner */}
      {hasCompanyProfile && (
        <div className="mb-8 flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-5 py-3">
          <Building2 className="h-4.5 w-4.5 text-emerald-600" />
          <p className="text-[13px] text-emerald-700">
            Les templates seront automatiquement personnalises avec le profil de votre entreprise.
          </p>
        </div>
      )}

      {/* Blank option first */}
      <div className="mb-10">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <BlankTemplateCard
            selected={selectedBlank}
            onClick={onSelectBlank}
          />
        </div>
      </div>

      {/* Templates by category */}
      {categories.map((category) => {
        const templates = AGENT_TEMPLATES.filter(
          (t) => t.category === category
        );
        if (templates.length === 0) return null;
        const cat = TEMPLATE_CATEGORIES[category];
        return (
          <div key={category} className="mb-10">
            <div className="mb-4">
              <h3 className="text-[15px] font-semibold text-slate-900">
                {cat.label}
              </h3>
              <p className="text-[13px] text-slate-500">{cat.description}</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  selected={selectedTemplate?.id === template.id}
                  onClick={() => onSelectTemplate(template)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Continue button */}
      <div className="sticky bottom-0 -mx-8 border-t border-slate-100 bg-white/80 px-8 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <p className="text-[13px] text-slate-500">
            {selectedTemplate
              ? `Modele selectionne : ${selectedTemplate.name}`
              : selectedBlank
                ? "Agent vierge selectionne"
                : "Selectionnez un modele pour continuer"}
          </p>
          <Button
            size="lg"
            disabled={!hasSelection}
            onClick={onContinue}
            className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50"
          >
            Continuer
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Step 2: Agent Creation Form ----------

interface AgentCreationFormProps {
  template: AgentTemplate | null;
  companyProfile: CompanyInfo | null;
  onBack: () => void;
}

function AgentCreationForm({ template, companyProfile, onBack }: AgentCreationFormProps) {
  // Apply company profile to template config if both exist
  const config = template?.config && companyProfile
    ? applyCompanyToTemplate(template.config, companyProfile)
    : template?.config;

  return (
    <div className="mx-auto max-w-2xl p-8">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux modeles
      </button>

      <Card className="border-0 bg-white shadow-sm">
        <CardContent className="p-8">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {template
                  ? `Creer depuis : ${template.name}`
                  : "Nouvel agent vierge"}
              </h2>
              <p className="text-sm text-slate-500">
                {template
                  ? "Personnalisez la configuration avant de creer"
                  : "Configurez votre agent depuis zero"}
              </p>
            </div>
          </div>

          <form action={createAgent} className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-[13px] font-medium text-slate-700"
              >
                Nom de l&apos;agent
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Ex: Sophie - Conseillere commerciale"
                defaultValue={config?.name ?? ""}
                required
                className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-colors focus:bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="description"
                className="text-[13px] font-medium text-slate-700"
              >
                Description
              </Label>
              <Input
                id="description"
                name="description"
                placeholder="Courte description du role de l'agent"
                defaultValue={config?.description ?? ""}
                className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-colors focus:bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="systemPrompt"
                className="text-[13px] font-medium text-slate-700"
              >
                Invite systeme
              </Label>
              <Textarea
                id="systemPrompt"
                name="systemPrompt"
                rows={12}
                required
                defaultValue={config?.systemPrompt ?? ""}
                placeholder={`[ROLE]\nTu es Sophie, conseillere commerciale chez...\n\n[CONTEXTE]\nTu travailles pour...\n\n[OBJECTIF]\nTon objectif est de...`}
                className="rounded-xl border-slate-200 bg-slate-50 font-mono text-[13px] leading-relaxed transition-colors focus:bg-white"
              />
              <p className="text-[11px] text-slate-400">
                Ce prompt definit la personnalite et le comportement de
                l&apos;agent lors des appels.
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="firstMessage"
                className="text-[13px] font-medium text-slate-700"
              >
                Premier message
              </Label>
              <Textarea
                id="firstMessage"
                name="firstMessage"
                rows={3}
                defaultValue={config?.firstMessage ?? ""}
                placeholder="Le premier message que l'agent prononcera au debut de l'appel"
                className="rounded-xl border-slate-200 bg-slate-50 text-[13px] leading-relaxed transition-colors focus:bg-white"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="language"
                  className="text-[13px] font-medium text-slate-700"
                >
                  Langue
                </Label>
                <Select
                  name="language"
                  defaultValue={config?.language ?? "fr-FR"}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr-FR">Francais</SelectItem>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="en-GB">English (UK)</SelectItem>
                    <SelectItem value="es-ES">Espanol</SelectItem>
                    <SelectItem value="de-DE">Deutsch</SelectItem>
                    <SelectItem value="ar-SA">العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="voiceId"
                  className="text-[13px] font-medium text-slate-700"
                >
                  Voix
                </Label>
                <Select
                  name="voiceId"
                  defaultValue={config?.voiceId ?? "minimax-Camille"}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50">
                    <SelectValue placeholder="Selectionner une voix" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimax-Camille">
                      Camille (Femme)
                    </SelectItem>
                    <SelectItem value="default-female">
                      Sophie (Femme)
                    </SelectItem>
                    <SelectItem value="default-male">
                      Thomas (Homme)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Hidden defaults from template or fallbacks */}
            <input
              type="hidden"
              name="llmModel"
              value={config?.llmModel ?? "gpt-4.1"}
            />
            <input
              type="hidden"
              name="firstMessageMode"
              value={config?.firstMessageMode ?? "dynamic"}
            />
            <input
              type="hidden"
              name="voiceSpeed"
              value={String(config?.voiceSpeed ?? 1.0)}
            />
            <input
              type="hidden"
              name="voiceTemperature"
              value={String(config?.voiceTemperature ?? 1.0)}
            />
            <input
              type="hidden"
              name="maxCallDuration"
              value={String(config?.maxCallDuration ?? 300)}
            />
            <input
              type="hidden"
              name="silenceTimeout"
              value={String(config?.silenceTimeout ?? 10)}
            />
            <input
              type="hidden"
              name="endCallOnSilence"
              value={config?.endCallOnSilence !== false ? "on" : "off"}
            />
            <input
              type="hidden"
              name="enableRecording"
              value={config?.enableRecording !== false ? "on" : "off"}
            />
            <input
              type="hidden"
              name="maxSafetyRetries"
              value={String(config?.maxSafetyRetries ?? 3)}
            />

            <div className="flex justify-end border-t border-slate-100 pt-6">
              <Button
                type="submit"
                size="lg"
                className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25"
              >
                Creer et configurer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
