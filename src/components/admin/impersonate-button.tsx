"use client";

import { Button } from "@/components/ui/button";
import { UserCheck } from "lucide-react";
import { startImpersonation } from "@/app/(dashboard)/admin/impersonation-actions";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

interface ImpersonateButtonProps {
  clientId?: string;
  orgId?: string;
  label?: string;
  alwaysVisible?: boolean;
}

export function ImpersonateButton({
  clientId,
  orgId,
  label = "Impersonner",
  alwaysVisible = false,
}: ImpersonateButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const targetId = orgId || clientId;
  if (!targetId) return null;

  const handleClick = () => {
    startTransition(async () => {
      await startImpersonation(targetId);
      router.push("/dashboard");
    });
  };

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      size="sm"
      disabled={isPending}
      className={`rounded-lg text-xs transition-opacity ${
        alwaysVisible ? "" : "opacity-0 group-hover:opacity-100"
      }`}
    >
      <UserCheck className="h-3.5 w-3.5 mr-1" />
      {isPending ? "..." : label}
    </Button>
  );
}
