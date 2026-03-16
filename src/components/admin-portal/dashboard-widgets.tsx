"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, AlertTriangle } from "lucide-react";

interface DashboardWidgetsProps {
  alerts: {
    contractsPending: number;
    paymentAlerts: number;
  };
  nextActions: Array<{
    id: string;
    name: string;
    company: string | null;
    nextAction: string | null;
    nextActionDate: Date | null;
    stage: string;
  }>;
  recentClients: Array<{
    id: string;
    clientId: string;
    createdAt: Date;
    client: { id: string; name: string; company: string | null };
  }>;
}

export function DashboardWidgets({
  alerts,
  nextActions,
  recentClients,
}: DashboardWidgetsProps) {
  const now = new Date();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Alertes */}
      <Card className="shadow-sm">
        <CardContent className="space-y-1 p-5">
          <h3 className="mb-3 text-sm font-semibold">Alertes</h3>

          <Link
            href="/admin-portal/clients"
            className="flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-muted"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="h-4 w-4 text-amber-500" />
              <span className="text-sm">Contrats en attente</span>
            </div>
            <span
              className={`text-sm font-semibold ${alerts.contractsPending > 0 ? "text-amber-600" : "text-muted-foreground"}`}
            >
              {alerts.contractsPending}
            </span>
          </Link>

          <Link
            href="/admin-portal/billing"
            className="flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-muted"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm">Paiements en alerte</span>
            </div>
            <span
              className={`text-sm font-semibold ${alerts.paymentAlerts > 0 ? "text-red-600" : "text-muted-foreground"}`}
            >
              {alerts.paymentAlerts}
            </span>
          </Link>
        </CardContent>
      </Card>

      {/* Prochaines actions */}
      <Card className="shadow-sm">
        <CardContent className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Prochaines actions</h3>
          {nextActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune action planifiée.
            </p>
          ) : (
            <div className="space-y-1">
              {nextActions.map((prospect) => {
                const isOverdue =
                  prospect.nextActionDate != null &&
                  new Date(prospect.nextActionDate) < now;
                const formattedDate = prospect.nextActionDate
                  ? new Date(prospect.nextActionDate).toLocaleDateString(
                      "fr-FR",
                      { day: "numeric", month: "short" }
                    )
                  : null;

                return (
                  <Link
                    key={prospect.id}
                    href={`/admin-portal/prospects/${prospect.id}`}
                    className="flex items-start justify-between gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isOverdue && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                        )}
                        <p className="truncate text-sm font-medium">
                          {prospect.name}
                        </p>
                      </div>
                      {prospect.nextAction && (
                        <p className="truncate text-xs text-muted-foreground">
                          {prospect.nextAction}
                        </p>
                      )}
                    </div>
                    {formattedDate && (
                      <p
                        className={`shrink-0 text-xs ${isOverdue ? "font-medium text-red-600" : "text-muted-foreground"}`}
                      >
                        {formattedDate}
                        {isOverdue && " — retard"}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Derniers clients */}
      <Card className="shadow-sm md:col-span-2">
        <CardContent className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Derniers clients</h3>
          {recentClients.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun client enregistré.
            </p>
          ) : (
            <div className="space-y-1">
              {recentClients.map((item) => {
                const formattedDate = new Date(item.createdAt).toLocaleDateString(
                  "fr-FR",
                  { day: "numeric", month: "short", year: "numeric" }
                );

                return (
                  <Link
                    key={item.id}
                    href={`/admin-portal/clients/${item.client.id}`}
                    className="flex items-center justify-between gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.client.name}
                      </p>
                      {item.client.company && (
                        <p className="truncate text-xs text-muted-foreground">
                          {item.client.company}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {formattedDate}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
