"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Phone,
  Clock,
  Calendar,
  User,
  Megaphone,
  ChevronDown,
  ChevronUp,
  Volume2,
  MessageSquareText,
  Sparkles,
  Info,
  RefreshCw,
} from "lucide-react";
import type { CallListItem } from "@/app/(dashboard)/calls/actions";
import { syncCallFromRetell } from "@/app/(dashboard)/calls/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusConfig(status: string) {
  switch (status) {
    case "completed":
      return {
        label: "Terminé",
        className: "border-0 bg-emerald-50 text-emerald-700",
      };
    case "failed":
      return {
        label: "Échoué",
        className: "border-0 bg-red-50 text-red-700",
      };
    case "no_answer":
      return {
        label: "Sans réponse",
        className: "border-0 bg-slate-100 text-slate-600",
      };
    case "in_progress":
      return {
        label: "En cours",
        className: "border-0 bg-blue-50 text-blue-700",
      };
    case "pending":
      return {
        label: "En attente",
        className: "border-0 bg-amber-50 text-amber-700",
      };
    default:
      return {
        label: status,
        className: "border-0 bg-slate-100 text-slate-600",
      };
  }
}

function sentimentConfig(sentiment: string | null) {
  if (!sentiment) return null;
  const s = sentiment.toLowerCase();
  if (s.includes("positive") || s.includes("positif") || s === "positive") {
    return { emoji: "\ud83d\ude0a", label: "Positif", className: "border-0 bg-emerald-50 text-emerald-700" };
  }
  if (s.includes("negative") || s.includes("négatif") || s.includes("negatif") || s === "negative") {
    return { emoji: "\ud83d\ude1e", label: "Négatif", className: "border-0 bg-red-50 text-red-700" };
  }
  return { emoji: "\ud83d\ude10", label: "Neutre", className: "border-0 bg-slate-100 text-slate-600" };
}

// ---------------------------------------------------------------------------
// Transcript Parser
// ---------------------------------------------------------------------------
interface TranscriptMessage {
  speaker: "agent" | "user";
  text: string;
}

function parseTranscript(transcript: string | null): TranscriptMessage[] {
  if (!transcript) return [];

  const lines = transcript.split("\n").filter((l) => l.trim());
  const messages: TranscriptMessage[] = [];

  for (const line of lines) {
    const agentMatch = line.match(/^(?:Agent|Bot|Assistant)\s*:\s*(.+)/i);
    const userMatch = line.match(/^(?:User|Utilisateur|Customer|Client)\s*:\s*(.+)/i);

    if (agentMatch) {
      messages.push({ speaker: "agent", text: agentMatch[1].trim() });
    } else if (userMatch) {
      messages.push({ speaker: "user", text: userMatch[1].trim() });
    } else if (messages.length > 0) {
      // Continuation of previous message
      messages[messages.length - 1].text += " " + line.trim();
    } else {
      // Default to agent if no prefix found
      messages.push({ speaker: "agent", text: line.trim() });
    }
  }

  return messages;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface CallDetailDialogProps {
  call: CallListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCallUpdated?: (call: CallListItem) => void;
}

export function CallDetailDialog({
  call,
  open,
  onOpenChange,
  onCallUpdated,
}: CallDetailDialogProps) {
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  if (!call) return null;

  const st = statusConfig(call.status);
  const sent = sentimentConfig(call.sentiment);
  const messages = parseTranscript(call.transcript);
  const contactName = call.contact?.name || "Inconnu";
  const contactPhone = call.contact?.phone || "—";

  const handleSync = async () => {
    if (!call.retellCallId) return;
    setSyncing(true);
    try {
      const updated = await syncCallFromRetell(call.retellCallId);
      onCallUpdated?.(updated);
    } catch (err) {
      console.error("Erreur sync Retell:", err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-2xl"
      >
        <SheetHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-start justify-between pr-8">
            <div>
              <SheetTitle className="text-lg font-semibold text-slate-900">
                {contactName}
              </SheetTitle>
              <SheetDescription className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                <Phone className="h-3.5 w-3.5" />
                {contactPhone}
              </SheetDescription>
            </div>
          </div>

          {/* Meta badges */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge className={st.className}>{st.label}</Badge>
            {sent && (
              <Badge className={sent.className}>
                {sent.emoji} {sent.label}
              </Badge>
            )}
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Calendar className="h-3 w-3" />
              {formatDateTime(call.createdAt)}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="h-3 w-3" />
              {formatDuration(call.duration)}
            </span>
          </div>

          {/* Sync button */}
          {call.retellCallId && (
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="text-xs"
              >
                <RefreshCw
                  className={`mr-1.5 h-3 w-3 ${syncing ? "animate-spin" : ""}`}
                />
                {syncing ? "Synchronisation..." : "Sync depuis Retell"}
              </Button>
            </div>
          )}
        </SheetHeader>

        <div className="space-y-5 p-4">
          {/* Audio Player */}
          {call.recordingUrl && (
            <Card className="border-0 bg-gradient-to-r from-indigo-50 to-violet-50 shadow-sm">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Volume2 className="h-4 w-4 text-indigo-500" />
                  Enregistrement
                </div>
                <audio
                  controls
                  className="w-full"
                  src={call.recordingUrl}
                  preload="metadata"
                >
                  Votre navigateur ne supporte pas la lecture audio.
                </audio>
              </CardContent>
            </Card>
          )}

          {/* AI Summary */}
          {call.summary && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Résumé IA
                </div>
                <p className="text-sm leading-relaxed text-slate-600">
                  {call.summary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Transcript */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                <MessageSquareText className="h-4 w-4 text-blue-500" />
                Transcription complète
              </div>

              {messages.length > 0 ? (
                <div className="space-y-3">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${
                        msg.speaker === "agent" ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                          msg.speaker === "agent"
                            ? "rounded-bl-md bg-gradient-to-br from-indigo-50 to-blue-50 text-slate-700"
                            : "rounded-br-md bg-gradient-to-br from-slate-100 to-slate-50 text-slate-700"
                        }`}
                      >
                        <p
                          className={`mb-1 text-[10px] font-semibold uppercase tracking-wider ${
                            msg.speaker === "agent"
                              ? "text-indigo-500"
                              : "text-slate-400"
                          }`}
                        >
                          {msg.speaker === "agent" ? "Agent IA" : "Interlocuteur"}
                        </p>
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <MessageSquareText className="mb-2 h-8 w-8 text-slate-200" />
                  <p className="text-sm text-slate-400">
                    Aucune transcription disponible pour cet appel.
                  </p>
                  {call.retellCallId && (
                    <p className="mt-1 text-xs text-slate-300">
                      Essayez de synchroniser depuis Retell.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Info className="h-4 w-4 text-slate-400" />
                Détails
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-medium text-slate-400">Campagne</p>
                  <p className="mt-0.5 text-slate-700">
                    {call.campaign ? (
                      <span className="flex items-center gap-1">
                        <Megaphone className="h-3 w-3 text-slate-400" />
                        {call.campaign.name}
                      </span>
                    ) : (
                      "Appel direct"
                    )}
                  </p>
                </div>
                {call.outcome && (
                  <div>
                    <p className="text-xs font-medium text-slate-400">
                      Résultat
                    </p>
                    <p className="mt-0.5 text-slate-700">{call.outcome}</p>
                  </div>
                )}
                {call.contact?.score !== null &&
                  call.contact?.score !== undefined && (
                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        Score contact
                      </p>
                      <p className="mt-0.5 text-slate-700">
                        {call.contact.score}/100
                        {call.contact.scoreLabel && (
                          <span className="ml-1.5 text-xs text-slate-400">
                            ({call.contact.scoreLabel})
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                <div>
                  <p className="text-xs font-medium text-slate-400">Contact</p>
                  <p className="mt-0.5 text-slate-700">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3 text-slate-400" />
                      {contactName}
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metadata (collapsible) */}
          {call.metadata &&
            typeof call.metadata === "object" &&
            Object.keys(call.metadata as object).length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <button
                    onClick={() => setMetadataOpen(!metadataOpen)}
                    className="flex w-full items-center justify-between text-sm font-medium text-slate-700"
                  >
                    <span>Métadonnées</span>
                    {metadataOpen ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                  {metadataOpen && (
                    <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                      {JSON.stringify(call.metadata, null, 2)}
                    </pre>
                  )}
                </CardContent>
              </Card>
            )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
