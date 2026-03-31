"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, KeyRound } from "lucide-react";
import { sendClientInvite, sendClientReset } from "../actions";

export function SendAccessButton({
  clientId,
  hasPassword,
}: {
  clientId: string;
  hasPassword: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  function handleSend() {
    setSent(false);
    startTransition(async () => {
      if (hasPassword) {
        await sendClientReset(clientId);
      } else {
        await sendClientInvite(clientId);
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <span className="text-xs text-emerald-600 font-medium">Email envoyé</span>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSend}
      disabled={isPending}
      className="rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity"
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin mr-1" />
      ) : hasPassword ? (
        <KeyRound className="h-3 w-3 mr-1" />
      ) : (
        <Mail className="h-3 w-3 mr-1" />
      )}
      {hasPassword ? "Reset MDP" : "Renvoyer invitation"}
    </Button>
  );
}
