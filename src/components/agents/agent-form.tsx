"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <CardTitle>
            {agent ? "Modifier l'agent" : "Nouvel agent IA"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de l'agent</Label>
            <Input
              id="name"
              name="name"
              placeholder="Ex: Assistant commercial"
              defaultValue={agent?.name}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              placeholder="Courte description du rôle de l'agent"
              defaultValue={agent?.description ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="systemPrompt">Prompt système</Label>
            <Textarea
              id="systemPrompt"
              name="systemPrompt"
              rows={10}
              defaultValue={agent?.systemPrompt}
              placeholder="Décris le comportement de l'agent, son ton, ses objectifs, les informations qu'il doit collecter..."
              required
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Ce prompt définit la personnalité et le comportement de l'agent
              lors des appels.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="language">Langue</Label>
              <Select
                name="language"
                defaultValue={agent?.language ?? "fr-FR"}
              >
                <SelectTrigger>
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
              <Label htmlFor="voiceId">Voix</Label>
              <Select
                name="voiceId"
                defaultValue={agent?.voiceId ?? "default-female"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une voix" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default-female">Sophie (Femme)</SelectItem>
                  <SelectItem value="default-male">Thomas (Homme)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="submit" size="lg">
              {agent ? "Enregistrer les modifications" : "Créer l'agent"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
