"use client";

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
import { createAgent, updateAgent } from "@/app/(dashboard)/agents/actions";
import { Bot } from "lucide-react";

interface AgentFormProps {
  agent?: {
    id: string;
    name: string;
    description: string | null;
    systemPrompt: string;
    voiceId: string | null;
    language: string;
  };
}

export function AgentForm({ agent }: AgentFormProps) {
  const action = agent
    ? (formData: FormData) => updateAgent(agent.id, formData)
    : createAgent;

  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardContent className="p-8">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {agent ? "Modifier l'agent" : "Nouvel agent IA"}
            </h2>
            <p className="text-sm text-slate-500">
              {agent
                ? "Modifiez la configuration de votre agent"
                : "Configurez le comportement de votre agent d'appels"}
            </p>
          </div>
        </div>

        <form action={action} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[13px] font-medium text-slate-700">
              Nom de l&apos;agent
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="Ex: Assistant commercial"
              defaultValue={agent?.name}
              required
              className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-colors focus:bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-[13px] font-medium text-slate-700">
              Description
            </Label>
            <Input
              id="description"
              name="description"
              placeholder="Courte description du rôle de l'agent"
              defaultValue={agent?.description ?? ""}
              className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-colors focus:bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="systemPrompt" className="text-[13px] font-medium text-slate-700">
              Prompt système
            </Label>
            <Textarea
              id="systemPrompt"
              name="systemPrompt"
              rows={10}
              defaultValue={agent?.systemPrompt}
              placeholder="Décris le comportement de l'agent, son ton, ses objectifs, les informations qu'il doit collecter..."
              required
              className="rounded-xl border-slate-200 bg-slate-50 font-mono text-sm transition-colors focus:bg-white"
            />
            <p className="text-[11px] text-slate-400">
              Ce prompt définit la personnalité et le comportement de l&apos;agent
              lors des appels.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="language" className="text-[13px] font-medium text-slate-700">
                Langue
              </Label>
              <Select name="language" defaultValue={agent?.language ?? "fr-FR"}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr-FR">Français</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="en-GB">English (UK)</SelectItem>
                  <SelectItem value="es-ES">Español</SelectItem>
                  <SelectItem value="de-DE">Deutsch</SelectItem>
                  <SelectItem value="ar-SA">العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="voiceId" className="text-[13px] font-medium text-slate-700">
                Voix
              </Label>
              <Select name="voiceId" defaultValue={agent?.voiceId ?? "default-female"}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50">
                  <SelectValue placeholder="Sélectionner une voix" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default-female">Sophie (Femme)</SelectItem>
                  <SelectItem value="default-male">Thomas (Homme)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
            <Button
              type="submit"
              size="lg"
              className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30"
            >
              {agent ? "Enregistrer les modifications" : "Créer l'agent"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
