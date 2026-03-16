"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
function formatCentimes(centimes: number): string {
  const euros = (centimes / 100).toFixed(2).replace(".", ",");
  return `${euros} €`;
}
import { TrendingUp, AlertCircle, CreditCard, Activity } from "lucide-react";

const subscriptionStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  active: { label: "Actif", className: "bg-emerald-50 text-emerald-700" },
  inactive: { label: "Inactif", className: "bg-slate-50 text-slate-600" },
  suspended: { label: "Suspendu", className: "bg-amber-50 text-amber-700" },
  cancelled: { label: "Annulé", className: "bg-red-50 text-red-700" },
};

const invoiceStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  draft: { label: "Brouillon", className: "bg-slate-50 text-slate-600" },
  sent: { label: "Envoyée", className: "bg-blue-50 text-blue-700" },
  paid: { label: "Payée", className: "bg-emerald-50 text-emerald-700" },
  overdue: { label: "En retard", className: "bg-red-50 text-red-700" },
};

interface BillingOverviewProps {
  data: {
    kpis: {
      mrr: number;
      mrrFormatted: string;
      unpaidCount: number;
      unpaidAmount: string;
      totalSubscriptions: number;
      activeSubscriptions: number;
    };
    subscriptions: Array<{
      id: string;
      orgId: string;
      monthlyPrice: number;
      pricePerMinute: number;
      status: string;
      client: { name: string; company: string | null; clientId: string } | null;
      [key: string]: unknown;
    }>;
    recentInvoices: Array<{
      id: string;
      invoiceNumber: string;
      periodMonth: number;
      periodYear: number;
      totalTTC: number;
      status: string;
      client: { name: string; company: string | null; clientId: string } | null;
      [key: string]: unknown;
    }>;
  };
}

export function BillingOverview({ data }: BillingOverviewProps) {
  const { kpis, subscriptions, recentInvoices } = data;

  const kpiCards = [
    {
      label: "MRR total",
      value: kpis.mrrFormatted,
      icon: TrendingUp,
      iconBg: "bg-gradient-to-br from-indigo-400 to-indigo-600",
      iconColor: "text-white",
    },
    {
      label: "Factures impayées",
      value: String(kpis.unpaidCount),
      icon: AlertCircle,
      iconBg: "bg-gradient-to-br from-red-400 to-red-600",
      iconColor: "text-white",
    },
    {
      label: "Montant impayé",
      value: kpis.unpaidAmount,
      icon: CreditCard,
      iconBg: "bg-gradient-to-br from-red-400 to-red-600",
      iconColor: "text-white",
    },
    {
      label: "Abonnements actifs",
      value: String(kpis.activeSubscriptions),
      icon: Activity,
      iconBg: "bg-gradient-to-br from-emerald-400 to-emerald-600",
      iconColor: "text-white",
    },
  ];

  return (
    <div className="space-y-8 p-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${card.iconBg}`}
                >
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold leading-tight">
                    {card.value}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {card.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Client subscriptions */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Abonnements clients
        </h2>
        {subscriptions.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed py-10">
            <p className="text-sm text-muted-foreground">
              Aucun abonnement configuré.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subscriptions.map((sub) => {
              const statusCfg = subscriptionStatusConfig[sub.status] ?? {
                label: sub.status,
                className: "bg-slate-50 text-slate-600",
              };
              const clientName = sub.client?.name ?? "—";
              const clientCompany = sub.client?.company ?? null;
              const clientId = sub.client?.clientId ?? null;

              const card = (
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-sm">
                        {clientName}
                      </p>
                      {clientCompany && (
                        <p className="truncate text-xs text-muted-foreground">
                          {clientCompany}
                        </p>
                      )}
                      <p className="mt-1 text-sm font-medium">
                        {formatCentimes(sub.monthlyPrice)}
                        <span className="text-xs font-normal text-muted-foreground">
                          {" "}
                          / mois
                        </span>
                      </p>
                    </div>
                    <Badge className={statusCfg.className}>
                      {statusCfg.label}
                    </Badge>
                  </CardContent>
                </Card>
              );

              if (clientId) {
                return (
                  <Link
                    key={sub.id}
                    href={`/admin-portal/clients/${clientId}`}
                    className="block"
                  >
                    {card}
                  </Link>
                );
              }

              return <div key={sub.id}>{card}</div>;
            })}
          </div>
        )}
      </div>

      {/* Recent invoices */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Factures récentes
        </h2>
        {recentInvoices.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed py-10">
            <p className="text-sm text-muted-foreground">
              Aucune facture générée.
            </p>
          </div>
        ) : (
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className="divide-y">
                {recentInvoices.map((invoice) => {
                  const statusCfg = invoiceStatusConfig[invoice.status] ?? {
                    label: invoice.status,
                    className: "bg-slate-50 text-slate-600",
                  };
                  const clientName = invoice.client?.name ?? "—";
                  const period = new Date(
                    invoice.periodYear,
                    invoice.periodMonth - 1
                  ).toLocaleDateString("fr-FR", {
                    month: "long",
                    year: "numeric",
                  });

                  return (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {invoice.invoiceNumber}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            — {clientName}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">
                          {period}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <p className="text-sm font-semibold">
                          {formatCentimes(invoice.totalTTC)}
                        </p>
                        <Badge className={statusCfg.className}>
                          {statusCfg.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
