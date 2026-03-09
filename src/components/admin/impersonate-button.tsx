"use client";

import { Button } from "@/components/ui/button";
import { UserCheck } from "lucide-react";
import { startImpersonation } from "@/app/(dashboard)/admin/impersonation-actions";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

interface ImpersonateButtonProps {
  clientId: string;
}

export function ImpersonateButton({ clientId }: ImpersonateButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = () => {
    startTransition(async () => {
      await startImpersonation(clientId);
      router.push("/dashboard");
    });
  };

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      size="sm"
      disabled={isPending}
      className="rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity"
    >
      <UserCheck className="h-3.5 w-3.5 mr-1" />
      {isPending ? "..." : "Impersonner"}
    </Button>
  );
}
