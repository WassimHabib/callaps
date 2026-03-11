"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreditCard,
  Activity,
  Calculator,
  FileText,
  Download,
  AlertCircle,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { formatCentimes } from "@/lib/billing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Subscription {
  id: string;
  orgId: string;
  monthlyPrice: number;
  pricePerMinute: number;
  status: string;
  freeTrialType: string;
  companyName: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  orgId: string;
  periodMonth: number;
  periodYear: number;
  subscriptionAmount: number;
  minutesUsed: number;
  minutesAmount: number;
  totalHT: number;
  tvaAmount: number;
  totalTTC: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

interface Usage {
  totalSeconds: number;
  totalMinutes: number;
  callCount: number;
}

interface BillingClientProps {
  subscription: Subscription | null;
  invoices: Invoice[];
  usage: Usage;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  "Janvier",
  "Fevrier",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Aout",
  "Septembre",
  "Octobre",
  "Novembre",
  "Decembre",
];

function subscriptionStatusBadge(status: string) {
  const styles: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700",
    paused: "bg-amber-50 text-amber-700",
    cancelled: "bg-red-50 text-red-700",
  };

  const labels: Record<string, string> = {
    active: "Actif",
    paused: "En pause",
    cancelled: "Annule",
  };

  return (
    <Badge
      className={`rounded-lg border-0 text-xs font-semibold ${styles[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {labels[status] ?? status}
    </Badge>
  );
}

function invoiceStatusBadge(status: string) {
  const styles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    sent: "bg-blue-50 text-blue-700",
    paid: "bg-emerald-50 text-emerald-700",
    overdue: "bg-red-50 text-red-700",
  };

  const labels: Record<string, string> = {
    draft: "Brouillon",
    sent: "Envoyee",
    paid: "Payee",
    overdue: "En retard",
  };

  return (
    <Badge
      className={`rounded-lg border-0 text-xs font-semibold ${styles[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {labels[status] ?? status}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BillingClient({
  subscription,
  invoices,
  usage,
}: BillingClientProps) {
  const now = new Date();
  const currentMonthName = MONTH_NAMES[now.getMonth()];
  const currentYear = now.getFullYear();

  // Estimated cost calculations
  const minutesCost = subscription
    ? usage.totalMinutes * subscription.pricePerMinute
    : 0;
  const estimatedHT = subscription
    ? subscription.monthlyPrice + minutesCost
    : 0;
  const estimatedTVA = Math.round((estimatedHT * 2000) / 10000);
  const estimatedTTC = estimatedHT + estimatedTVA;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header
        title="Facturation"
        description="Suivez votre consommation et vos factures"
      />

      <div className="space-y-8 p-8">
        {/* No subscription state */}
        {!subscription && (
          <Card className="border-0 bg-white shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300">
                <AlertCircle className="h-7 w-7 text-slate-500" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-700">
                Aucun abonnement actif.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Contactez notre equipe commerciale.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Subscription cards */}
        {subscription && (
          <>
            <div className="grid gap-5 md:grid-cols-3">
              {/* Card 1: Mon abonnement */}
              <Card className="group border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[13px] font-medium text-slate-500">
                        Mon abonnement
                      </p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/20">
                      <CreditCard className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-slate-500">
                        Mensualite
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {formatCentimes(subscription.monthlyPrice)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-slate-500">
                        Prix par minute
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {formatCentimes(subscription.pricePerMinute)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-slate-500">
                        Statut
                      </span>
                      {subscriptionStatusBadge(subscription.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Consommation du mois */}
              <Card className="group border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[13px] font-medium text-slate-500">
                        Consommation du mois
                      </p>
                      <p className="mt-0.5 text-[12px] text-slate-400">
                        {currentMonthName} {currentYear}
                      </p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/20">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-slate-500">
                        Minutes consommees
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {usage.totalMinutes} min
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-slate-500">
                        Nombre d&apos;appels
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {usage.callCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-slate-500">
                        Cout estime
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {formatCentimes(minutesCost)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Estimation prochaine facture */}
              <Card className="group border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[13px] font-medium text-slate-500">
                        Estimation prochaine facture
                      </p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 shadow-lg shadow-amber-500/20">
                      <Calculator className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-slate-500">
                        Abonnement
                      </span>
                      <span className="text-sm text-slate-700">
                        {formatCentimes(subscription.monthlyPrice)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-slate-500">
                        Minutes
                      </span>
                      <span className="text-sm text-slate-700">
                        {formatCentimes(minutesCost)}
                      </span>
                    </div>
                    <div className="my-1 h-px bg-slate-100" />
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-slate-500">
                        Total HT
                      </span>
                      <span className="text-sm font-medium text-slate-700">
                        {formatCentimes(estimatedHT)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-slate-500">
                        TVA 20%
                      </span>
                      <span className="text-sm text-slate-700">
                        {formatCentimes(estimatedTVA)}
                      </span>
                    </div>
                    <div className="my-1 h-px bg-slate-100" />
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-slate-700">
                        Total TTC
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {formatCentimes(estimatedTTC)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Invoices section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">
                Historique des factures
              </h2>
              <p className="text-[12px] text-slate-500">
                Retrouvez toutes vos factures
              </p>
            </div>
          </div>

          <Card className="border-0 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-slate-500">
                    N° facture
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">
                    Periode
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">
                    Abonnement
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">
                    Minutes
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">
                    Total TTC
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">
                    Statut
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-12 text-center text-sm text-slate-400"
                    >
                      Aucune facture pour le moment
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => (
                    <TableRow key={inv.id} className="group">
                      <TableCell>
                        <span className="font-mono text-sm text-slate-700">
                          {inv.invoiceNumber}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">
                          {MONTH_NAMES[inv.periodMonth - 1]} {inv.periodYear}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-700">
                          {formatCentimes(inv.subscriptionAmount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-700">
                          {formatCentimes(inv.minutesAmount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-slate-900">
                          {formatCentimes(inv.totalTTC)}
                        </span>
                      </TableCell>
                      <TableCell>{invoiceStatusBadge(inv.status)}</TableCell>
                      <TableCell className="text-right">
                        <a
                          href={`/api/invoices/${inv.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg text-xs"
                          >
                            <Download className="mr-1 h-3.5 w-3.5" />
                            Telecharger
                          </Button>
                        </a>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
