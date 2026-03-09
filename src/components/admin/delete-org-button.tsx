"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useTransition, useState } from "react";
import { deleteOrganization } from "@/app/(dashboard)/admin/organizations/actions";
import { useRouter } from "next/navigation";

interface DeleteOrgButtonProps {
  orgId: string;
  orgName: string;
}

export function DeleteOrgButton({ orgId, orgName }: DeleteOrgButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteOrganization(orgId);
      router.push("/admin/organizations");
    });
  };

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-600">
          Supprimer &quot;{orgName}&quot; ?
        </span>
        <Button
          onClick={handleDelete}
          variant="outline"
          size="sm"
          disabled={isPending}
          className="rounded-lg text-xs text-red-600 hover:bg-red-50"
        >
          {isPending ? "..." : "Confirmer"}
        </Button>
        <Button
          onClick={() => setShowConfirm(false)}
          variant="outline"
          size="sm"
          className="rounded-lg text-xs"
        >
          Annuler
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => setShowConfirm(true)}
      variant="outline"
      size="sm"
      className="rounded-lg text-xs text-red-500 hover:bg-red-50"
    >
      <Trash2 className="mr-1 h-3.5 w-3.5" />
      Supprimer l&apos;organisation
    </Button>
  );
}
