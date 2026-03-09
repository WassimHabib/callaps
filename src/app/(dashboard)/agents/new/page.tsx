import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bot } from "lucide-react";
import { createAgent } from "../actions";

export default function NewAgentPage() {
  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header
        title="Nouvel Agent IA"
        description="Créez un agent, puis configurez-le en détail"
      />
      <div className="mx-auto max-w-2xl p-8">
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-8">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Créer un agent
                </h2>
                <p className="text-sm text-slate-500">
                  Donnez un nom et un prompt, vous pourrez tout configurer ensuite
                </p>
              </div>
            </div>

            <form action={createAgent} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-slate-700">
                  Nom de l&apos;agent
                </Label>
                <Input
                  name="name"
                  placeholder="Ex: Sophie - Conseillère commerciale"
                  required
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-colors focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-slate-700">
                  Description
                </Label>
                <Input
                  name="description"
                  placeholder="Courte description du rôle de l'agent"
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-colors focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-slate-700">
                  Invite système
                </Label>
                <Textarea
                  name="systemPrompt"
                  rows={12}
                  required
                  placeholder={`[ROLE]\nTu es Sophie, conseillère commerciale chez...\n\n[CONTEXTE]\nTu travailles pour...\n\n[OBJECTIF]\nTon objectif est de...`}
                  className="rounded-xl border-slate-200 bg-slate-50 font-mono text-[13px] leading-relaxed transition-colors focus:bg-white"
                />
              </div>

              {/* Hidden defaults */}
              <input type="hidden" name="language" value="fr-FR" />
              <input type="hidden" name="llmModel" value="gpt-4.1" />
              <input type="hidden" name="voiceId" value="camille" />
              <input type="hidden" name="firstMessageMode" value="dynamic" />
              <input type="hidden" name="voiceProvider" value="elevenlabs" />
              <input type="hidden" name="voiceSpeed" value="1.0" />
              <input type="hidden" name="voiceStability" value="0.5" />
              <input type="hidden" name="maxCallDuration" value="300" />
              <input type="hidden" name="silenceTimeout" value="10" />
              <input type="hidden" name="endCallOnSilence" value="on" />
              <input type="hidden" name="enableRecording" value="on" />
              <input type="hidden" name="maxSafetyRetries" value="3" />

              <div className="flex justify-end border-t border-slate-100 pt-6">
                <Button
                  type="submit"
                  size="lg"
                  className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25"
                >
                  Créer et configurer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
