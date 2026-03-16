"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchProspects } from "@/app/(dashboard)/admin-portal/prospects/actions";

const stageConfig: Record<string, { label: string; className: string }> = {
  prospect: { label: "Prospect", className: "bg-slate-50 text-slate-600" },
  contacted: { label: "Contacté", className: "bg-blue-50 text-blue-700" },
  demo_scheduled: { label: "Démo planifiée", className: "bg-indigo-50 text-indigo-700" },
  demo_done: { label: "Démo faite", className: "bg-violet-50 text-violet-700" },
  proposal_sent: { label: "Proposition", className: "bg-amber-50 text-amber-700" },
  negotiation: { label: "Négociation", className: "bg-orange-50 text-orange-700" },
  converted: { label: "Converti", className: "bg-emerald-50 text-emerald-700" },
  lost: { label: "Perdu", className: "bg-red-50 text-red-700" },
};

const sourceConfig: Record<string, string> = {
  manual: "Manuel",
  referral: "Recommandation",
  website: "Site web",
  event: "Événement",
  other: "Autre",
};

interface ProspectListProps {
  initialProspects: Awaited<ReturnType<typeof fetchProspects>>;
}

export function ProspectList({ initialProspects }: ProspectListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("all");
  const [source, setSource] = useState("all");
  const [prospects, setProspects] = useState(initialProspects);

  function applyFilters(newSearch: string, newStage: string, newSource: string) {
    startTransition(async () => {
      const results = await fetchProspects(
        newSearch || undefined,
        newStage === "all" ? undefined : newStage,
        newSource === "all" ? undefined : newSource,
      );
      setProspects(results);
    });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    applyFilters(value, stage, source);
  }

  function handleStageChange(value: string) {
    setStage(value);
    applyFilters(search, value, source);
  }

  function handleSourceChange(value: string) {
    setSource(value);
    applyFilters(search, stage, value);
  }

  return (
    <div className="space-y-6 p-6">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="Rechercher un prospect…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={stage} onValueChange={(v) => v && handleStageChange(v)}>
            <SelectTrigger className="sm:w-52">
              <SelectValue placeholder="Toutes les étapes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les étapes</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="contacted">Contacté</SelectItem>
              <SelectItem value="demo_scheduled">Démo planifiée</SelectItem>
              <SelectItem value="demo_done">Démo faite</SelectItem>
              <SelectItem value="proposal_sent">Proposition</SelectItem>
              <SelectItem value="negotiation">Négociation</SelectItem>
              <SelectItem value="converted">Converti</SelectItem>
              <SelectItem value="lost">Perdu</SelectItem>
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={(v) => v && handleSourceChange(v)}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Toutes les sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les sources</SelectItem>
              <SelectItem value="manual">Manuel</SelectItem>
              <SelectItem value="referral">Recommandation</SelectItem>
              <SelectItem value="website">Site web</SelectItem>
              <SelectItem value="event">Événement</SelectItem>
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => router.push("/admin-portal/prospects/new")}>
          Nouveau prospect
        </Button>
      </div>

      {/* Results */}
      {isPending && (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      )}

      {!isPending && prospects.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Aucun prospect trouvé
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ajustez vos filtres ou créez un nouveau prospect.
          </p>
        </div>
      )}

      {!isPending && prospects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {prospects.map((prospect) => {
            const stageCfg = stageConfig[prospect.stage] ?? {
              label: prospect.stage,
              className: "bg-slate-50 text-slate-600",
            };
            const sourceLabel = sourceConfig[prospect.source ?? ""] ?? prospect.source ?? "—";
            const isOverdue =
              prospect.nextActionDate != null &&
              new Date(prospect.nextActionDate) < new Date();
            const formattedValue =
              prospect.estimatedValue != null
                ? new Intl.NumberFormat("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                    maximumFractionDigits: 0,
                  }).format(prospect.estimatedValue / 100)
                : null;

            return (
              <Card
                key={prospect.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => router.push(`/admin-portal/prospects/${prospect.id}`)}
              >
                <CardContent className="space-y-3 p-4">
                  {/* Name + company */}
                  <div>
                    <p className="font-semibold leading-tight">{prospect.name}</p>
                    {prospect.company && (
                      <p className="text-sm text-muted-foreground">{prospect.company}</p>
                    )}
                  </div>

                  {/* Phone */}
                  {prospect.phone && (
                    <p className="text-sm text-muted-foreground">{prospect.phone}</p>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge className={stageCfg.className}>{stageCfg.label}</Badge>
                    {prospect.source && (
                      <Badge className="bg-slate-100 text-slate-600">{sourceLabel}</Badge>
                    )}
                  </div>

                  {/* Estimated value */}
                  {formattedValue && (
                    <p className="text-sm font-medium">{formattedValue}</p>
                  )}

                  {/* Next action */}
                  {prospect.nextAction && (
                    <div>
                      <p className="text-xs text-muted-foreground">Prochaine action</p>
                      <p className="text-sm">{prospect.nextAction}</p>
                      {prospect.nextActionDate && (
                        <p
                          className={`text-xs ${isOverdue ? "font-medium text-red-600" : "text-muted-foreground"}`}
                        >
                          {new Date(prospect.nextActionDate).toLocaleDateString("fr-FR")}
                          {isOverdue && " — en retard"}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Activity count */}
                  {prospect._count?.activities != null && (
                    <p className="text-xs text-muted-foreground">
                      {prospect._count.activities} activité
                      {prospect._count.activities !== 1 ? "s" : ""}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
