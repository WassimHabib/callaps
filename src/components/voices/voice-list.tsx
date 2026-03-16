"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CloneVoiceDialog } from "./clone-voice-dialog";
import { deleteClonedVoice, toggleVoiceSharing } from "@/app/(dashboard)/voices/actions";
import { Trash2, Share2, Mic } from "lucide-react";

interface ClonedVoice {
  id: string;
  orgId: string;
  name: string;
  retellVoiceId: string;
  gender: string;
  createdBy: string;
  shared: boolean;
  createdAt: Date;
}

interface VoiceListProps {
  voices: ClonedVoice[];
  orgVoiceCount: number;
  isAdmin: boolean;
  currentOrgId: string | null;
}

export function VoiceList({ voices, orgVoiceCount, isAdmin, currentOrgId }: VoiceListProps) {
  const limitReached = orgVoiceCount >= 3;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Mes voix clonées</h1>
          <p className="mt-1 text-sm text-slate-500">
            {orgVoiceCount}/3 voix utilisées
          </p>
        </div>
        <CloneVoiceDialog disabled={limitReached} />
      </div>

      {limitReached && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-700">
            Vous avez atteint la limite de 3 voix clonées. Supprimez une voix pour en créer une nouvelle.
          </p>
        </div>
      )}

      {voices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Mic className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            Aucune voix clonée pour le moment.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Clonez votre voix pour personnaliser vos agents IA.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {voices.map((voice) => (
            <VoiceCard
              key={voice.id}
              voice={voice}
              isAdmin={isAdmin}
              isOwn={voice.orgId === currentOrgId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VoiceCard({
  voice,
  isAdmin,
  isOwn,
}: {
  voice: ClonedVoice;
  isAdmin: boolean;
  isOwn: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      await deleteClonedVoice(voice.id);
      setDeleteOpen(false);
    });
  }

  function handleToggleShare() {
    startTransition(async () => {
      await toggleVoiceSharing(voice.id);
    });
  }

  const date = new Date(voice.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {voice.name}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <Badge className="bg-slate-100 text-slate-600 text-[10px] border-0">
                {voice.gender === "Male" ? "Homme" : "Femme"}
              </Badge>
              {voice.shared && (
                <Badge className="bg-indigo-50 text-indigo-600 text-[10px] border-0">
                  Partagée
                </Badge>
              )}
              {!isOwn && (
                <Badge className="bg-violet-50 text-violet-600 text-[10px] border-0">
                  Externe
                </Badge>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-400">{date}</p>
          </div>

          {(isOwn || isAdmin) && (
            <div className="flex items-center gap-1 shrink-0">
              {isAdmin && isOwn && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleShare}
                  disabled={isPending}
                  className="h-8 w-8 p-0"
                  title={voice.shared ? "Retirer le partage" : "Partager"}
                >
                  <Share2
                    className={`h-3.5 w-3.5 ${voice.shared ? "text-indigo-500" : "text-slate-400"}`}
                  />
                </Button>
              )}

              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                      title="Supprimer"
                    />
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Supprimer cette voix ?</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-slate-600">
                    La voix <strong>{voice.name}</strong> sera définitivement
                    supprimée. Les agents qui l&apos;utilisent devront être reconfigurés.
                  </p>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setDeleteOpen(false)}
                      disabled={isPending}
                    >
                      Annuler
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isPending}
                    >
                      {isPending ? "Suppression..." : "Supprimer"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
