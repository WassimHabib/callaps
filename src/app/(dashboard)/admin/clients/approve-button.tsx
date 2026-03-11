"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2 } from "lucide-react";
import { approveClient } from "../actions";

export function ApproveButton({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      await approveClient(clientId);
    });
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <Badge className="border-0 bg-amber-50 text-amber-600 text-xs">
        En attente
      </Badge>
      <Button
        variant="outline"
        size="sm"
        onClick={handleApprove}
        disabled={isPending}
        className="rounded-lg border-emerald-200 text-xs text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <CheckCircle2 className="h-3 w-3 mr-1" />
        )}
        Approuver
      </Button>
    </div>
  );
}
