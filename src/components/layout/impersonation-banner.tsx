"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { stopImpersonation } from "@/app/(dashboard)/admin/impersonation-actions";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

interface ImpersonationBannerProps {
  orgId: string;
}

export function ImpersonationBanner({ orgId }: ImpersonationBannerProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleStop = () => {
    startTransition(async () => {
      await stopImpersonation();
      router.refresh();
    });
  };

  return (
    <div className="flex items-center justify-between bg-red-600 px-4 py-2 text-sm text-white">
      <span>
        Mode impersonation — Organisation: <strong>{orgId}</strong>
      </span>
      <Button
        onClick={handleStop}
        variant="outline"
        size="sm"
        disabled={isPending}
        className="border-white/30 bg-transparent text-white hover:bg-white/10 text-xs"
      >
        <X className="h-3 w-3 mr-1" />
        Quitter
      </Button>
    </div>
  );
}
