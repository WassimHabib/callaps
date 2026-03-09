"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useTransition, useState } from "react";
import {
  removeMemberFromOrganization,
  updateMemberRole,
} from "@/app/(dashboard)/admin/organizations/actions";
import { useRouter } from "next/navigation";

const ROLES = [
  { value: "org:org_admin", label: "Admin" },
  { value: "org:manager", label: "Manager" },
  { value: "org:operator", label: "Opérateur" },
  { value: "org:viewer", label: "Lecteur" },
];

interface OrgMemberActionsProps {
  orgId: string;
  userId: string;
  currentRole: string;
  memberName: string;
}

export function OrgMemberActions({
  orgId,
  userId,
  currentRole,
  memberName,
}: OrgMemberActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const handleRoleChange = (newRole: string) => {
    startTransition(async () => {
      await updateMemberRole(orgId, userId, newRole);
      router.refresh();
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      await removeMemberFromOrganization(orgId, userId);
      setShowConfirm(false);
      router.refresh();
    });
  };

  if (showConfirm) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-red-600">
          Retirer {memberName} ?
        </span>
        <Button
          onClick={handleRemove}
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
    <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
      <select
        value={currentRole}
        onChange={(e) => handleRoleChange(e.target.value)}
        disabled={isPending}
        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <Button
        onClick={() => setShowConfirm(true)}
        variant="outline"
        size="sm"
        className="rounded-lg text-xs text-red-500 hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
