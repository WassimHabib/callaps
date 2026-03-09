"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useTransition, useRef } from "react";
import { createOrganization } from "@/app/(dashboard)/admin/organizations/actions";
import { useRouter } from "next/navigation";

export function CreateOrgForm() {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      try {
        await createOrganization(formData);
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
        name="name"
        placeholder="Nom de l'organisation"
        required
        className="h-9 w-[220px] text-sm"
      />
      <Button
        type="submit"
        size="sm"
        disabled={isPending}
        className="h-9 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-xs text-white hover:from-indigo-600 hover:to-violet-600"
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        {isPending ? "Création..." : "Créer"}
      </Button>
    </form>
  );
}
