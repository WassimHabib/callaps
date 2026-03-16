"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProspect } from "@/app/(dashboard)/admin-portal/prospects/actions";

export function ProspectForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [source, setSource] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Le nom est requis.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createProspect({
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          company: company.trim() || undefined,
          source: source || undefined,
          estimatedValue: estimatedValue
            ? Math.round(parseFloat(estimatedValue) * 100)
            : undefined,
          nextAction: nextAction.trim() || undefined,
          nextActionDate: nextActionDate || undefined,
          notes: notes.trim() || undefined,
        });

        router.push("/admin-portal/prospects");
      } catch {
        setError("Une erreur est survenue. Veuillez réessayer.");
      }
    });
  }

  return (
    <div className="p-6">
      <Card className="mx-auto max-w-2xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Nom <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Prénom Nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Phone + Email */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+33 6 00 00 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Company */}
            <div className="space-y-1.5">
              <Label htmlFor="company">Entreprise</Label>
              <Input
                id="company"
                placeholder="Nom de l'entreprise"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            {/* Source + Estimated value */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="source">Source</Label>
                <Select value={source} onValueChange={(v) => v && setSource(v)}>
                  <SelectTrigger id="source">
                    <SelectValue placeholder="Sélectionner une source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manuel</SelectItem>
                    <SelectItem value="referral">Recommandation</SelectItem>
                    <SelectItem value="website">Site web</SelectItem>
                    <SelectItem value="event">Événement</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="estimatedValue">Valeur estimée (€)</Label>
                <Input
                  id="estimatedValue"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                />
              </div>
            </div>

            {/* Next action + date */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nextAction">Prochaine action</Label>
                <Input
                  id="nextAction"
                  placeholder="Ex : Envoyer une proposition"
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nextActionDate">Date de la prochaine action</Label>
                <Input
                  id="nextActionDate"
                  type="date"
                  value={nextActionDate}
                  onChange={(e) => setNextActionDate(e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Informations complémentaires…"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm font-medium text-red-600">{error}</p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin-portal/prospects")}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Enregistrement…" : "Créer le prospect"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
