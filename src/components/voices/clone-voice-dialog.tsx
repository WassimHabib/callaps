"use client";

import { useState, useTransition, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClonedVoice } from "@/app/(dashboard)/voices/actions";
import { Plus, Upload } from "lucide-react";

interface CloneVoiceDialogProps {
  disabled?: boolean;
}

export function CloneVoiceDialog({ disabled }: CloneVoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("Female");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setName("");
    setGender("Female");
    setFile(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleSubmit() {
    if (!name.trim()) {
      setError("Le nom est requis");
      return;
    }
    if (!file) {
      setError("Le fichier audio est requis");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Le fichier ne doit pas dépasser 10 MB");
      return;
    }

    setError(null);
    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("gender", gender);
    formData.append("file", file);

    startTransition(async () => {
      try {
        await createClonedVoice(formData);
        reset();
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors du clonage");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5" disabled={disabled} />
        }
      >
        <Plus className="h-4 w-4" />
        Cloner une voix
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cloner une voix</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Nom de la voix *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Ma voix, Voix du patron..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Genre</label>
            <Select value={gender} onValueChange={(v) => v && setGender(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Female">Femme</SelectItem>
                <SelectItem value="Male">Homme</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Fichier audio *
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-slate-200 p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50"
            >
              <Upload className="h-5 w-5 text-slate-400" />
              <div className="min-w-0 flex-1">
                {file ? (
                  <p className="truncate text-sm font-medium text-slate-700">
                    {file.name}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">
                    Cliquez pour sélectionner un fichier audio ou vidéo (max 10 MB)
                  </p>
                )}
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,video/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !name.trim() || !file}
            >
              {isPending ? "Clonage en cours..." : "Cloner"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
