"use client";

import { useState } from "react";
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
import { Building2, MapPin, Globe, Phone, Mail, Clock, Target, Sparkles, Check } from "lucide-react";
import { saveCompanyProfile } from "@/app/(dashboard)/settings/actions";

interface CompanyProfileData {
  id?: string;
  name: string;
  activity: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  zipCode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  openingHours?: string | null;
  tone?: string | null;
  targetAudience?: string | null;
  uniqueValue?: string | null;
}

export function CompanyProfileForm({
  initialData,
}: {
  initialData: CompanyProfileData | null;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    const form = new FormData(e.currentTarget);
    await saveCompanyProfile({
      name: form.get("name") as string,
      activity: form.get("activity") as string,
      description: (form.get("description") as string) || undefined,
      address: (form.get("address") as string) || undefined,
      city: (form.get("city") as string) || undefined,
      zipCode: (form.get("zipCode") as string) || undefined,
      country: (form.get("country") as string) || undefined,
      phone: (form.get("phone") as string) || undefined,
      email: (form.get("email") as string) || undefined,
      website: (form.get("website") as string) || undefined,
      openingHours: (form.get("openingHours") as string) || undefined,
      tone: (form.get("tone") as string) || undefined,
      targetAudience: (form.get("targetAudience") as string) || undefined,
      uniqueValue: (form.get("uniqueValue") as string) || undefined,
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Section: Identite */}
      <div>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
            <Building2 className="h-4.5 w-4.5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-slate-900">Identite de l&apos;entreprise</h3>
            <p className="text-[12px] text-slate-500">Informations de base utilisees dans les prompts agents</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-slate-700">
                Nom de l&apos;entreprise *
              </Label>
              <Input
                name="name"
                required
                defaultValue={initialData?.name ?? ""}
                placeholder="Ex: Cabinet Martin & Associes"
                className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-colors focus:bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-slate-700">
                Secteur d&apos;activite *
              </Label>
              <Input
                name="activity"
                required
                defaultValue={initialData?.activity ?? ""}
                placeholder="Ex: Agence immobiliere, Cabinet dentaire"
                className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-colors focus:bg-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[13px] font-medium text-slate-700">
              Description de l&apos;activite
            </Label>
            <Textarea
              name="description"
              rows={3}
              defaultValue={initialData?.description ?? ""}
              placeholder="Decrivez en quelques lignes ce que fait votre entreprise, vos specialites..."
              className="rounded-xl border-slate-200 bg-slate-50 text-[13px] transition-colors focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Section: Localisation */}
      <div>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
            <MapPin className="h-4.5 w-4.5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-slate-900">Localisation</h3>
            <p className="text-[12px] text-slate-500">Adresse et zone geographique</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[13px] font-medium text-slate-700">Adresse</Label>
            <Input
              name="address"
              defaultValue={initialData?.address ?? ""}
              placeholder="Ex: 12 rue de la Paix"
              className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-colors focus:bg-white"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-slate-700">Ville</Label>
              <Input
                name="city"
                defaultValue={initialData?.city ?? ""}
                placeholder="Ex: Paris"
                className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-colors focus:bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-slate-700">Code postal</Label>
              <Input
                name="zipCode"
                defaultValue={initialData?.zipCode ?? ""}
                placeholder="Ex: 75002"
                className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-colors focus:bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-slate-700">Pays</Label>
              <Input
                name="country"
                defaultValue={initialData?.country ?? "France"}
                className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-colors focus:bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section: Contact */}
      <div>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50">
            <Globe className="h-4.5 w-4.5 text-sky-600" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-slate-900">Coordonnees</h3>
            <p className="text-[12px] text-slate-500">Telephone, email et site web</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-[13px] font-medium text-slate-700">
              <Phone className="mr-1.5 inline h-3.5 w-3.5" />
              Telephone
            </Label>
            <Input
              name="phone"
              defaultValue={initialData?.phone ?? ""}
              placeholder="Ex: 01 23 45 67 89"
              className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-colors focus:bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[13px] font-medium text-slate-700">
              <Mail className="mr-1.5 inline h-3.5 w-3.5" />
              Email
            </Label>
            <Input
              name="email"
              type="email"
              defaultValue={initialData?.email ?? ""}
              placeholder="Ex: contact@exemple.fr"
              className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-colors focus:bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[13px] font-medium text-slate-700">
              <Globe className="mr-1.5 inline h-3.5 w-3.5" />
              Site web
            </Label>
            <Input
              name="website"
              defaultValue={initialData?.website ?? ""}
              placeholder="Ex: www.exemple.fr"
              className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-colors focus:bg-white"
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label className="text-[13px] font-medium text-slate-700">
            <Clock className="mr-1.5 inline h-3.5 w-3.5" />
            Horaires d&apos;ouverture
          </Label>
          <Input
            name="openingHours"
            defaultValue={initialData?.openingHours ?? ""}
            placeholder="Ex: Lundi-Vendredi 9h-18h, Samedi 9h-12h"
            className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-colors focus:bg-white"
          />
        </div>
      </div>

      {/* Section: Personnalite IA */}
      <div>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
            <Sparkles className="h-4.5 w-4.5 text-violet-600" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-slate-900">Personnalite de l&apos;IA</h3>
            <p className="text-[12px] text-slate-500">Ces informations personnalisent automatiquement les prompts de vos agents</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[13px] font-medium text-slate-700">Ton de communication</Label>
            <Select name="tone" defaultValue={initialData?.tone ?? "professionnel"}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professionnel">Professionnel</SelectItem>
                <SelectItem value="amical">Amical et accessible</SelectItem>
                <SelectItem value="formel">Formel et corporate</SelectItem>
                <SelectItem value="decontracte">Decontracte</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[13px] font-medium text-slate-700">
              <Target className="mr-1.5 inline h-3.5 w-3.5" />
              Public cible
            </Label>
            <Input
              name="targetAudience"
              defaultValue={initialData?.targetAudience ?? ""}
              placeholder="Ex: Particuliers et PME, Professionnels de sante, Entreprises B2B"
              className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-colors focus:bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[13px] font-medium text-slate-700">
              Proposition de valeur unique
            </Label>
            <Textarea
              name="uniqueValue"
              rows={2}
              defaultValue={initialData?.uniqueValue ?? ""}
              placeholder="Ex: 20 ans d'experience, service 24/7, meilleur rapport qualite-prix de la region..."
              className="rounded-xl border-slate-200 bg-slate-50 text-[13px] transition-colors focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
        <p className="text-[12px] leading-relaxed text-indigo-700">
          <Sparkles className="mr-1.5 inline h-3.5 w-3.5" />
          Ces informations seront automatiquement injectees dans les templates d&apos;agents.
          Lorsque vous creez un agent depuis un template, le prompt sera personnalise avec
          le nom de votre entreprise, votre activite, votre localisation et votre ton de communication.
        </p>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-600">
            <Check className="h-4 w-4" />
            Profil enregistre
          </span>
        )}
        <Button
          type="submit"
          disabled={saving}
          className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25"
        >
          {saving ? "Enregistrement..." : "Enregistrer le profil"}
        </Button>
      </div>
    </form>
  );
}
