"use client";

import { useState, useTransition, useRef, useCallback } from "react";
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
  importContacts,
  deleteCampaign,
} from "@/app/(dashboard)/campaigns/actions";
import {
  Play,
  Pause,
  RotateCcw,
  Upload,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CampaignActionsBarProps {
  campaignId: string;
  status: string;
}

export function CampaignActionsBar({
  campaignId,
  status,
}: CampaignActionsBarProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const router = useRouter();

  const handleAction = (action: () => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (e) {
        setError(String(e instanceof Error ? e.message : e));
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="mr-2 text-sm text-red-500">{error}</span>
      )}

      {(status === "draft" || status === "scheduled") && (
        <Button
          onClick={() => handleAction(() => launchCampaign(campaignId))}
          disabled={isPending}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25"
        >
          <Play className="mr-2 h-4 w-4" />
          {isPending ? "Lancement..." : "Lancer"}
        </Button>
      )}

      {status === "running" && (
        <Button
          onClick={() => handleAction(() => pauseCampaign(campaignId))}
          disabled={isPending}
          variant="outline"
          className="border-amber-200 text-amber-600 hover:bg-amber-50"
        >
          <Pause className="mr-2 h-4 w-4" />
          {isPending ? "Pause..." : "Mettre en pause"}
        </Button>
      )}

      {status === "paused" && (
        <Button
          onClick={() => handleAction(() => resumeCampaign(campaignId))}
          disabled={isPending}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          {isPending ? "Reprise..." : "Reprendre"}
        </Button>
      )}

      {status !== "completed" && (
        <ImportDialog
          campaignId={campaignId}
          open={importOpen}
          onOpenChange={setImportOpen}
        />
      )}

      <DeleteDialog
        campaignId={campaignId}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}

function ImportDialog({
  campaignId,
  open,
  onOpenChange,
}: {
  campaignId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [leads, setLeads] = useState<
    { name: string; phone: string; email?: string }[]
  >([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const parseCSV = useCallback((text: string) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return;
    const header = lines[0].toLowerCase().split(/[,;]/);
    const nameIdx = header.findIndex((h) =>
      ["name", "nom", "prenom", "prénom"].includes(h.trim())
    );
    const phoneIdx = header.findIndex((h) =>
      [
        "phone",
        "telephone",
        "téléphone",
        "tel",
        "numero",
        "numéro",
        "number",
      ].includes(h.trim())
    );
    const emailIdx = header.findIndex((h) =>
      ["email", "mail", "e-mail"].includes(h.trim())
    );

    if (phoneIdx === -1) return;

    const parsed: { name: string; phone: string; email?: string }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[,;]/);
      const phone = cols[phoneIdx]?.trim();
      if (!phone) continue;
      parsed.push({
        name: nameIdx >= 0 ? cols[nameIdx]?.trim() || "" : "",
        phone,
        email: emailIdx >= 0 ? cols[emailIdx]?.trim() || undefined : undefined,
      });
    }
    setLeads((prev) => [...prev, ...parsed]);
  }, []);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
        file.text().then(parseCSV);
      }
    },
    [parseCSV]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        file.text().then(parseCSV);
      }
    },
    [parseCSV]
  );

  const handleImport = () => {
    if (leads.length === 0) return;
    startTransition(async () => {
      await importContacts(campaignId, leads);
      setLeads([]);
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger>
        <Button variant="outline" size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Ajouter des contacts
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importer des contacts</DialogTitle>
          <DialogDescription>
            Importez un fichier CSV avec les colonnes: nom, telephone, email
            (optionnel)
          </DialogDescription>
        </DialogHeader>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            isDragging
              ? "border-indigo-400 bg-indigo-50"
              : "border-slate-200 hover:border-slate-300"
          )}
        >
          <Upload className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 text-sm text-slate-600">
            Deposez le fichier ici ou cliquez pour parcourir
          </p>
          <p className="mt-1 text-xs text-slate-400">
            CSV avec colonnes: nom, telephone, email (optionnel)
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>

        {leads.length > 0 && (
          <div className="max-h-48 overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium text-slate-600">Nom</th>
                  <th className="px-3 py-2 font-medium text-slate-600">
                    Telephone
                  </th>
                  <th className="px-3 py-2 font-medium text-slate-600">
                    Email
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{lead.name || "—"}</td>
                    <td className="px-3 py-2">{lead.phone}</td>
                    <td className="px-3 py-2 text-slate-500">
                      {lead.email || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLeads((prev) => prev.filter((_, j) => j !== i));
                        }}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setLeads([]);
              onOpenChange(false);
            }}
          >
            Annuler
          </Button>
          <Button onClick={handleImport} disabled={leads.length === 0 || isPending}>
            {isPending
              ? "Importation..."
              : `Importer ${leads.length} contact${leads.length > 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  campaignId,
  open,
  onOpenChange,
}: {
  campaignId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteCampaign(campaignId);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger>
        <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50">
          <Trash2 className="mr-2 h-4 w-4" />
          Supprimer
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Suppression..." : "Supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
