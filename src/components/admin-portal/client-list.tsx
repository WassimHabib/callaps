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
import { fetchAdminClients } from "@/app/(dashboard)/admin-portal/clients/actions";

const statusConfig: Record<string, { label: string; className: string }> = {
  onboarding: { label: "Onboarding", className: "bg-blue-50 text-blue-700" },
  active: { label: "Actif", className: "bg-emerald-50 text-emerald-700" },
  suspended: { label: "Suspendu", className: "bg-amber-50 text-amber-700" },
  churned: { label: "Perdu", className: "bg-red-50 text-red-700" },
};

const contractConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-slate-50 text-slate-600" },
  sent: { label: "Envoyé", className: "bg-blue-50 text-blue-700" },
  signed: { label: "Signé", className: "bg-emerald-50 text-emerald-700" },
  expired: { label: "Expiré", className: "bg-red-50 text-red-700" },
};

const paymentConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-slate-50 text-slate-600" },
  authorized: { label: "Autorisé", className: "bg-blue-50 text-blue-700" },
  active: { label: "Actif", className: "bg-emerald-50 text-emerald-700" },
  failed: { label: "Échec", className: "bg-red-50 text-red-700" },
};

interface ClientListProps {
  initialClients: Awaited<ReturnType<typeof fetchAdminClients>>;
}

export function ClientList({ initialClients }: ClientListProps) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [isPending, startTransition] = useTransition();

  function handleSearchChange(value: string) {
    setSearch(value);
    startTransition(async () => {
      const result = await fetchAdminClients(
        value,
        status === "all" ? undefined : status
      );
      setClients(result);
    });
  }

  function handleStatusChange(value: string) {
    setStatus(value);
    startTransition(async () => {
      const result = await fetchAdminClients(
        search,
        value === "all" ? undefined : value
      );
      setClients(result);
    });
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3">
          <Input
            placeholder="Rechercher un client..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="max-w-sm"
          />
          <Select value={status} onValueChange={(v) => v && handleStatusChange(v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="onboarding">Onboarding</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="suspended">Suspendu</SelectItem>
              <SelectItem value="churned">Perdu</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => router.push("/admin-portal/clients/new")}>
          Nouveau client
        </Button>
      </div>

      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">Aucun client trouvé.</p>
          <Button
            variant="link"
            className="mt-2"
            onClick={() => router.push("/admin-portal/clients/new")}
          >
            Créer votre premier client
          </Button>
        </div>
      ) : (
        <div
          className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 transition-opacity ${isPending ? "opacity-50" : "opacity-100"}`}
        >
          {clients.map((item) => {
            const client = item.client;
            const statusCfg = statusConfig[item.status] ?? {
              label: item.status,
              className: "bg-slate-50 text-slate-600",
            };
            const contractCfg = item.contractStatus
              ? (contractConfig[item.contractStatus] ?? {
                  label: item.contractStatus,
                  className: "bg-slate-50 text-slate-600",
                })
              : null;
            const paymentCfg = item.paymentStatus
              ? (paymentConfig[item.paymentStatus] ?? {
                  label: item.paymentStatus,
                  className: "bg-slate-50 text-slate-600",
                })
              : null;

            return (
              <Card
                key={item.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() =>
                  router.push(`/admin-portal/clients/${client.id}`)
                }
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-sm">
                        {client.name}
                      </p>
                      {client.company && (
                        <p className="truncate text-xs text-muted-foreground">
                          {client.company}
                        </p>
                      )}
                    </div>
                    <Badge className={statusCfg.className}>
                      {statusCfg.label}
                    </Badge>
                  </div>

                  <p className="truncate text-xs text-muted-foreground">
                    {client.email}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {contractCfg && (
                      <Badge className={contractCfg.className}>
                        {contractCfg.label}
                      </Badge>
                    )}
                    {paymentCfg && (
                      <Badge className={paymentCfg.className}>
                        {paymentCfg.label}
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Mis à jour{" "}
                    {new Date(item.updatedAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
