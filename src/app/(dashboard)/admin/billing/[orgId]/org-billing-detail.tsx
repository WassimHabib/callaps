"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  CreditCard,
  Clock,
  Receipt,
  Pencil,
  Loader2,
  FileText,
  Plus,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { formatCentimes } from "@/lib/billing-utils";
import {
  upsertSubscription,
  pauseSubscription,
  activateSubscription,
  generateSingleInvoice,
  markInvoicePaid,
  markInvoiceSent,
  markInvoiceOverdue,
} from "../actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Subscription {
  id: string;
  orgId: string;
  monthlyPrice: number;
  pricePerMinute: number;
  freeTrialType: string;
  freeTrialMonths: number;
  startDate: string;
  status: string;
  companyName: string;
  companyAddress: string | null;
  companySiret: string | null;
  companyVat: string | null;
  notes: string | null;
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  orgId: string;
  subscriptionId: string;
  periodMonth: number;
  periodYear: number;
  subscriptionAmount: number;
  minutesUsed: number;
  minutesAmount: number;
  totalHT: number;
  tvaRate: number;
  tvaAmount: number;
  totalTTC: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

interface MonthlyUsage {
  totalSeconds: number;
  totalMinutes: number;
  callCount: number;
}

interface OrgBillingDetailProps {
  orgId: string;
  orgName: string;
  subscription: Subscription | null;
  invoices: Invoice[];
  usage: MonthlyUsage;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  "Janvier",
  "F\u00e9vrier",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Ao\u00fbt",
  "Septembre",
  "Octobre",
  "Novembre",
  "D\u00e9cembre",
];

const FREE_TRIAL_LABELS: Record<string, string> = {
  none: "Aucun",
  subscription_only: "Abo offert",
  minutes_only: "Minutes offertes",
  both: "Tout offert",
};

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700",
    paused: "bg-amber-50 text-amber-700",
    cancelled: "bg-red-50 text-red-700",
    draft: "bg-slate-100 text-slate-600",
    sent: "bg-blue-50 text-blue-700",
    paid: "bg-emerald-50 text-emerald-700",
    overdue: "bg-red-50 text-red-700",
  };

  const labels: Record<string, string> = {
    active: "Actif",
    paused: "En pause",
    cancelled: "Annul\u00e9",
    draft: "Brouillon",
    sent: "Envoy\u00e9e",
    paid: "Pay\u00e9e",
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

function freeTrialBadge(type: string) {
  if (type === "none") {
    return (
      <Badge className="rounded-lg border-0 bg-slate-100 text-xs font-semibold text-slate-500">
        Aucun
      </Badge>
    );
  }
  return (
    <Badge className="rounded-lg border-0 bg-violet-50 text-xs font-semibold text-violet-700">
      {FREE_TRIAL_LABELS[type] ?? type}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrgBillingDetail({
  orgId,
  orgName,
  subscription,
  invoices,
  usage,
}: OrgBillingDetailProps) {
  // Subscription dialog state
  const [subDialogOpen, setSubDialogOpen] = useState(false);

  // Generate invoice dialog state
  const [genDialogOpen, setGenDialogOpen] = useState(false);
  const [genMonth, setGenMonth] = useState(String(new Date().getMonth() + 1));
  const [genYear, setGenYear] = useState(String(new Date().getFullYear()));

  // Transitions
  const [isPending, startTransition] = useTransition();

  // Subscription form state
  const [formCompanyName, setFormCompanyName] = useState(
    subscription?.companyName ?? "",
  );
  const [formCompanyAddress, setFormCompanyAddress] = useState(
    subscription?.companyAddress ?? "",
  );
  const [formCompanySiret, setFormCompanySiret] = useState(
    subscription?.companySiret ?? "",
  );
  const [formCompanyVat, setFormCompanyVat] = useState(
    subscription?.companyVat ?? "",
  );
  const [formMonthlyPrice, setFormMonthlyPrice] = useState(
    subscription ? String(subscription.monthlyPrice / 100) : "",
  );
  const [formPricePerMinute, setFormPricePerMinute] = useState(
    subscription ? String(subscription.pricePerMinute / 100) : "",
  );
  const [formFreeTrialType, setFormFreeTrialType] = useState(
    subscription?.freeTrialType ?? "none",
  );
  const [formFreeTrialMonths, setFormFreeTrialMonths] = useState(
    subscription ? String(subscription.freeTrialMonths) : "1",
  );
  const [formNotes, setFormNotes] = useState(subscription?.notes ?? "");

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------

  const minutesCost = subscription
    ? usage.totalMinutes * subscription.pricePerMinute
    : 0;
  const estimatedTotal = subscription
    ? subscription.monthlyPrice + minutesCost
    : 0;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function openEditDialog() {
    setFormCompanyName(subscription?.companyName ?? "");
    setFormCompanyAddress(subscription?.companyAddress ?? "");
    setFormCompanySiret(subscription?.companySiret ?? "");
    setFormCompanyVat(subscription?.companyVat ?? "");
    setFormMonthlyPrice(
      subscription ? String(subscription.monthlyPrice / 100) : "",
    );
    setFormPricePerMinute(
      subscription ? String(subscription.pricePerMinute / 100) : "",
    );
    setFormFreeTrialType(subscription?.freeTrialType ?? "none");
    setFormFreeTrialMonths(
      subscription ? String(subscription.freeTrialMonths) : "1",
    );
    setFormNotes(subscription?.notes ?? "");
    setSubDialogOpen(true);
  }

  function handleSubmitSubscription() {
    startTransition(async () => {
      await upsertSubscription({
        orgId,
        companyName: formCompanyName,
        companyAddress: formCompanyAddress || undefined,
        companySiret: formCompanySiret || undefined,
        companyVat: formCompanyVat || undefined,
        monthlyPrice: Math.round(parseFloat(formMonthlyPrice || "0") * 100),
        pricePerMinute: Math.round(
          parseFloat(formPricePerMinute || "0") * 100,
        ),
        freeTrialType: formFreeTrialType as
          | "none"
          | "subscription_only"
          | "minutes_only"
          | "both",
        freeTrialMonths: parseInt(formFreeTrialMonths || "0", 10),
        notes: formNotes || undefined,
      });
      setSubDialogOpen(false);
    });
  }

  function handleToggleStatus() {
    if (!subscription) return;
    startTransition(async () => {
      if (subscription.status === "active") {
        await pauseSubscription(orgId);
      } else {
        await activateSubscription(orgId);
      }
    });
  }

  function handleGenerateInvoice() {
    startTransition(async () => {
      await generateSingleInvoice(
        orgId,
        parseInt(genMonth, 10),
        parseInt(genYear, 10),
      );
      setGenDialogOpen(false);
    });
  }

  function handleMarkPaid(invoiceId: string) {
    startTransition(async () => {
      await markInvoicePaid(invoiceId);
    });
  }

  function handleMarkSent(invoiceId: string) {
    startTransition(async () => {
      await markInvoiceSent(invoiceId);
    });
  }

  function handleMarkOverdue(invoiceId: string) {
    startTransition(async () => {
      await markInvoiceOverdue(invoiceId);
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header title="Facturation" description={orgName} />

      <div className="space-y-8 p-8">
        {/* Back link + title */}
        <div className="flex items-center gap-4">
          <Link href="/admin/billing">
            <Button variant="outline" size="sm" className="rounded-lg text-xs">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Retour
            </Button>
          </Link>
          <h2 className="text-xl font-bold text-slate-900">{orgName}</h2>
        </div>

        {/* Info cards */}
        <div className="grid gap-5 md:grid-cols-3">
          {/* Abonnement card */}
          <Card className="group border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-medium text-slate-500">
                    Abonnement
                  </p>
                  {subscription ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-2xl font-bold tracking-tight text-slate-900">
                        {formatCentimes(subscription.monthlyPrice)}
                        <span className="text-sm font-normal text-slate-500">
                          /mois
                        </span>
                      </p>
                      <p className="text-sm text-slate-600">
                        {formatCentimes(subscription.pricePerMinute)}/min
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        {statusBadge(subscription.status)}
                        {freeTrialBadge(subscription.freeTrialType)}
                      </div>
                      {subscription.freeTrialType !== "none" && (
                        <p className="text-xs text-slate-500">
                          {subscription.freeTrialMonths} mois offerts
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-400">
                      Aucun abonnement
                    </p>
                  )}
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/20">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conso ce mois card */}
          <Card className="group border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-medium text-slate-500">
                    Conso ce mois
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                    {usage.totalMinutes}{" "}
                    <span className="text-sm font-normal text-slate-500">
                      min
                    </span>
                  </p>
                  <p className="text-sm text-slate-600">
                    {usage.callCount} appels
                  </p>
                  {subscription && (
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {formatCentimes(minutesCost)} estim\u00e9s
                    </p>
                  )}
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/20">
                  <Clock className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prochaine facture card */}
          <Card className="group border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-medium text-slate-500">
                    Prochaine facture
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                    {formatCentimes(estimatedTotal)}
                  </p>
                  {subscription && (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-slate-500">
                        Abo : {formatCentimes(subscription.monthlyPrice)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Minutes : {formatCentimes(minutesCost)}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 shadow-lg shadow-amber-500/20">
                  <Receipt className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription edit section */}
        <div className="flex items-center gap-3">
          <Button onClick={openEditDialog} className="rounded-lg">
            <Pencil className="mr-2 h-4 w-4" />
            Modifier l&apos;abonnement
          </Button>
          {subscription && (
            <Button
              variant="outline"
              className="rounded-lg"
              disabled={isPending}
              onClick={handleToggleStatus}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {subscription.status === "active"
                ? "Mettre en pause"
                : "Activer"}
            </Button>
          )}
        </div>

        {/* Invoices section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Factures</h3>
            <Button
              onClick={() => setGenDialogOpen(true)}
              className="rounded-lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              G\u00e9n\u00e9rer une facture
            </Button>
          </div>

          <Card className="border-0 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-slate-500">
                    N\u00b0
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">
                    P\u00e9riode
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">
                    Montant TTC
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">
                    Statut
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-500">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
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
                        <span className="text-sm font-medium text-slate-900">
                          {formatCentimes(inv.totalTTC)}
                        </span>
                      </TableCell>
                      <TableCell>{statusBadge(inv.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {inv.status !== "paid" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg text-xs opacity-0 transition-opacity group-hover:opacity-100"
                              disabled={isPending}
                              onClick={() => handleMarkPaid(inv.id)}
                            >
                              {isPending ? (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              ) : null}
                              Marquer pay\u00e9
                            </Button>
                          )}
                          {inv.status === "draft" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg text-xs opacity-0 transition-opacity group-hover:opacity-100"
                              disabled={isPending}
                              onClick={() => handleMarkSent(inv.id)}
                            >
                              {isPending ? (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              ) : null}
                              Marquer envoy\u00e9
                            </Button>
                          )}
                          {inv.status === "sent" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg text-xs opacity-0 transition-opacity group-hover:opacity-100"
                              disabled={isPending}
                              onClick={() => handleMarkOverdue(inv.id)}
                            >
                              {isPending ? (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              ) : null}
                              Marquer en retard
                            </Button>
                          )}
                          <a
                            href={`/api/invoices/${inv.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg text-xs opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <FileText className="mr-1 h-3.5 w-3.5" />
                              PDF
                            </Button>
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Dialog: Subscription edit                                            */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {subscription
                ? "Modifier l\u2019abonnement"
                : "Nouvel abonnement"}
            </DialogTitle>
            <DialogDescription>
              {subscription
                ? "Modifiez les informations de l\u2019abonnement."
                : "Cr\u00e9ez un nouvel abonnement pour cette organisation."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="companyName">Nom entreprise</Label>
              <Input
                id="companyName"
                className="rounded-lg"
                value={formCompanyName}
                onChange={(e) => setFormCompanyName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="companyAddress">Adresse</Label>
              <Input
                id="companyAddress"
                className="rounded-lg"
                value={formCompanyAddress}
                onChange={(e) => setFormCompanyAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="companySiret">SIRET</Label>
                <Input
                  id="companySiret"
                  className="rounded-lg"
                  value={formCompanySiret}
                  onChange={(e) => setFormCompanySiret(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companyVat">N\u00b0 TVA</Label>
                <Input
                  id="companyVat"
                  className="rounded-lg"
                  value={formCompanyVat}
                  onChange={(e) => setFormCompanyVat(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="monthlyPrice">Montant mensuel (\u20ac)</Label>
                <Input
                  id="monthlyPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  className="rounded-lg"
                  value={formMonthlyPrice}
                  onChange={(e) => setFormMonthlyPrice(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pricePerMinute">Prix par minute (\u20ac)</Label>
                <Input
                  id="pricePerMinute"
                  type="number"
                  step="0.01"
                  min="0"
                  className="rounded-lg"
                  value={formPricePerMinute}
                  onChange={(e) => setFormPricePerMinute(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="freeTrialType">Type essai gratuit</Label>
                <Select
                  value={formFreeTrialType}
                  onValueChange={(v) => v && setFormFreeTrialType(v)}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    <SelectItem value="subscription_only">
                      Abonnement offert
                    </SelectItem>
                    <SelectItem value="minutes_only">
                      Minutes offertes
                    </SelectItem>
                    <SelectItem value="both">Tout offert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="freeTrialMonths">Mois offerts</Label>
                <Input
                  id="freeTrialMonths"
                  type="number"
                  min="0"
                  className="rounded-lg"
                  value={formFreeTrialMonths}
                  onChange={(e) => setFormFreeTrialMonths(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                className="rounded-lg"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-lg"
              onClick={() => setSubDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              className="rounded-lg"
              disabled={isPending || !formCompanyName}
              onClick={handleSubmitSubscription}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {subscription ? "Enregistrer" : "Cr\u00e9er"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Dialog: Generate invoice                                             */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={genDialogOpen} onOpenChange={setGenDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>G\u00e9n\u00e9rer une facture</DialogTitle>
            <DialogDescription>
              S\u00e9lectionnez le mois et l&apos;ann\u00e9e pour g\u00e9n\u00e9rer la facture de
              cette organisation.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="genMonth">Mois</Label>
              <Select value={genMonth} onValueChange={(v) => v && setGenMonth(v)}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="genYear">Ann\u00e9e</Label>
              <Input
                id="genYear"
                type="number"
                className="rounded-lg"
                value={genYear}
                onChange={(e) => setGenYear(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-lg"
              onClick={() => setGenDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              className="rounded-lg"
              disabled={isPending}
              onClick={handleGenerateInvoice}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              G\u00e9n\u00e9rer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
