"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  launchCampaign,
  pauseCampaign,
  resumeCampaign,
  deleteCampaignAction,
} from "@/app/(dashboard)/campaigns/actions";
import { Play, Pause, RotateCcw, Trash2 } from "lucide-react";

interface CampaignQuickActionsProps {
  campaignId: string;
  status: string;
}

export function CampaignQuickActions({
  campaignId,
  status,
}: CampaignQuickActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const router = useRouter();

  const handleAction = (action: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (e) {
        // Silently handle — could add toast later
        console.error(e);
      }
    });
  };

  return (
    <>
      {(status === "draft" || status === "scheduled") && (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAction(() => launchCampaign(campaignId));
          }}
          disabled={isPending}
          className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
        >
          <Play className="mr-1 h-3.5 w-3.5" />
          {isPending ? "..." : "Lancer"}
        </Button>
      )}

      {status === "running" && (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAction(() => pauseCampaign(campaignId));
          }}
          disabled={isPending}
          className="text-amber-600 hover:bg-amber-50 hover:text-amber-700"
        >
          <Pause className="mr-1 h-3.5 w-3.5" />
          {isPending ? "..." : "Pause"}
        </Button>
      )}

      {status === "paused" && (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAction(() => resumeCampaign(campaignId));
          }}
          disabled={isPending}
          className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
        >
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          {isPending ? "..." : "Reprendre"}
        </Button>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogTrigger>
          <Button
            size="sm"
            variant="outline"
            className="text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la campagne</DialogTitle>
            <DialogDescription>
              Cette action est irreversible. Tous les contacts et appels associes
              seront egalement supprimes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  await deleteCampaignAction(campaignId);
                  setDeleteOpen(false);
                  router.refresh();
                });
              }}
            >
              {isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
