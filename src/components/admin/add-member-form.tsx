"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus } from "lucide-react";
import { useTransition, useRef } from "react";
import { addMemberToOrganization } from "@/app/(dashboard)/admin/organizations/actions";
import { useRouter } from "next/navigation";

const ROLES = [
  { value: "org:org_admin", label: "Admin" },
  { value: "org:manager", label: "Manager" },
  { value: "org:operator", label: "Opérateur" },
  { value: "org:viewer", label: "Lecteur" },
];

interface AddMemberFormProps {
  orgId: string;
}

export function AddMemberForm({ orgId }: AddMemberFormProps) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      try {
        await addMemberToOrganization(orgId, formData);
        formRef.current?.reset();
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Erreur");
      }
    });
  };

  return (
    <form ref={formRef} action={handleSubmit} className="flex items-center gap-2">
      <Input
        name="email"
        type="email"
        placeholder="Email du membre"
        required
        className="h-9 w-[260px] text-sm"
      />
      <select
        name="role"
        defaultValue="org:viewer"
        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <Button
        type="submit"
        size="sm"
        disabled={isPending}
        className="h-9 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-xs text-white hover:from-indigo-600 hover:to-violet-600"
      >
        <UserPlus className="mr-1 h-3.5 w-3.5" />
        {isPending ? "Ajout..." : "Ajouter"}
      </Button>
    </form>
  );
}
