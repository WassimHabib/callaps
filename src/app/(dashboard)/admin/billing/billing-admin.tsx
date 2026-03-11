"use client";

import { useState, useTransition } from "react";
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
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
  Wallet,
  TrendingUp,
  AlertCircle,
  Plus,
  Pencil,
  Pause,
  Play,
  FileText,
  Loader2,
  Receipt,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { formatCentimes } from "@/lib/billing-utils";
import {
  upsertSubscription,
  pauseSubscription,
  activateSubscription,
  generateMonthlyInvoices,
  markInvoicePaid,
  markInvoiceSent,
} from "./actions";

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
  _count: { invoices: number };
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
  subscription: { companyName: string };
}

interface Organization {
  id: string;
  name: string;
}

interface BillingAdminProps {
  subscriptions: Subscription[];
  invoices: Invoice[];
  organizations: Organization[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
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
    cancelled: "Annulé",
    draft: "Brouillon",
    sent: "Envoyée",
    paid: "Payée",
    overdue: "En retard",
  };

  return (
    <Badge className={`rounded-lg border-0 text-xs font-semibold ${styles[status] ?? "bg-slate-100 text-slate-600"}`}>
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

export function BillingAdmin({
  subscriptions,
  invoices,
  organizations,
}: BillingAdminProps) {
  // Subscription dialog state
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);

  // Generate invoices dialog state
  const [genDialogOpen, setGenDialogOpen] = useState(false);
  const [genMonth, setGenMonth] = useState(String(new Date().getMonth() + 1));
  const [genYear, setGenYear] = useState(String(new Date().getFullYear()));

  // Transitions
  const [isPending, startTransition] = useTransition();

  // Subscription form state
  const [formOrgId, setFormOrgId] = useState("");
  const [formCompanyName, setFormCompanyName] = useState("");
  const [formCompanyAddress, setFormCompanyAddress] = useState("");
  const [formCompanySiret, setFormCompanySiret] = useState("");
  const [formCompanyVat, setFormCompanyVat] = useState("");
  const [formMonthlyPrice, setFormMonthlyPrice] = useState("");
  const [formPricePerMinute, setFormPricePerMinute] = useState("");
  const [formFreeTrialType, setFormFreeTrialType] = useState("none");
  const [formFreeTrialMonths, setFormFreeTrialMonths] = useState("1");
  const [formNotes, setFormNotes] = useState("");

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const activeSubscriptions = subscriptions.filter((s) => s.status === "active");
  const monthlyRevenue = activeSubscriptions.reduce((sum, s) => sum + s.monthlyPrice, 0);
  const unpaidInvoices = invoices.filter((i) => i.status !== "paid");

  // ---------------------------------------------------------------------------
  // Dialog helpers
  // ---------------------------------------------------------------------------

  function openCreateDialog() {
    setEditingSub(null);
    setFormOrgId("");
    setFormCompanyName("");
    setFormCompanyAddress("");
    setFormCompanySiret("");
    setFormCompanyVat("");
    setFormMonthlyPrice("");
    setFormPricePerMinute("");
    setFormFreeTrialType("none");
    setFormFreeTrialMonths("1");
    setFormNotes("");
    setSubDialogOpen(true);
  }

  function openEditDialog(sub: Subscription) {
    setEditingSub(sub);
    setFormOrgId(sub.orgId);
    setFormCompanyName(sub.companyName);
    setFormCompanyAddress(sub.companyAddress ?? "");
    setFormCompanySiret(sub.companySiret ?? "");
    setFormCompanyVat(sub.companyVat ?? "");
    setFormMonthlyPrice(String(sub.monthlyPrice / 100));
    setFormPricePerMinute(String(sub.pricePerMinute / 100));
    setFormFreeTrialType(sub.freeTrialType);
    setFormFreeTrialMonths(String(sub.freeTrialMonths));
    setFormNotes(sub.notes ?? "");
    setSubDialogOpen(true);
  }

  function handleSubmitSubscription() {
    startTransition(async () => {
      await upsertSubscription({
        orgId: formOrgId,
        companyName: formCompanyName,
        companyAddress: formCompanyAddress || undefined,
        companySiret: formCompanySiret || undefined,
        companyVat: formCompanyVat || undefined,
        monthlyPrice: Math.round(parseFloat(formMonthlyPrice || "0") * 100),
        pricePerMinute: Math.round(parseFloat(formPricePerMinute || "0") * 100),
        freeTrialType: formFreeTrialType as "none" | "subscription_only" | "minutes_only" | "both",
        freeTrialMonths: parseInt(formFreeTrialMonths || "0", 10),
        notes: formNotes || undefined,
      });
      setSubDialogOpen(false);
    });
  }

  function handleToggleStatus(sub: Subscription) {
    startTransition(async () => {
      if (sub.status === "active") {
        await pauseSubscription(sub.orgId);
      } else {
        await activateSubscription(sub.orgId);
      }
    });
  }

  function handleGenerateInvoices() {
    startTransition(async () => {
      await generateMonthlyInvoices(parseInt(genMonth, 10), parseInt(genYear, 10));
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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header title="Facturation" description="Gestion des abonnements et factures" />

      <div className="space-y-8 p-8">
        {/* Stats cards */}
        <div className="grid gap-5 md:grid-cols-3">
          <Card className="group border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-medium text-slate-500">
                    Abonnements actifs
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                    {activeSubscriptions.length}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/20">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-medium text-slate-500">
                    CA mensuel estimé
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                    {formatCentimes(monthlyRevenue)}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/20">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-medium text-slate-500">
                    Factures impayées
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                    {unpaidInvoices.length}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 shadow-lg shadow-amber-500/20">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="subscriptions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="subscriptions">Abonnements</TabsTrigger>
            <TabsTrigger value="invoices">Factures</TabsTrigger>
          </TabsList>

          {/* ----------------------------------------------------------------- */}
          {/* Tab: Abonnements                                                  */}
          {/* ----------------------------------------------------------------- */}
          <TabsContent value="subscriptions" className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={openCreateDialog}
                className="rounded-lg"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouvel abonnement
              </Button>
            </div>

            <Card className="border-0 shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-slate-500">Client</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Montant/mois</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Prix/min</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Essai gratuit</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Statut</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 text-center">Factures</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-sm text-slate-400">
                        Aucun abonnement pour le moment
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscriptions.map((sub) => (
                      <TableRow key={sub.id} className="group">
                        <TableCell>
                          <p className="text-sm font-medium text-slate-900">
                            {sub.companyName}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-700">
                            {formatCentimes(sub.monthlyPrice)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-700">
                            {formatCentimes(sub.pricePerMinute)}
                          </span>
                        </TableCell>
                        <TableCell>{freeTrialBadge(sub.freeTrialType)}</TableCell>
                        <TableCell>{statusBadge(sub.status)}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="border-0 bg-slate-100 text-xs font-semibold text-slate-600">
                            {sub._count.invoices}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg text-xs opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={() => openEditDialog(sub)}
                            >
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Modifier
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg text-xs opacity-0 transition-opacity group-hover:opacity-100"
                              disabled={isPending}
                              onClick={() => handleToggleStatus(sub)}
                            >
                              {isPending ? (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              ) : sub.status === "active" ? (
                                <Pause className="mr-1 h-3.5 w-3.5" />
                              ) : (
                                <Play className="mr-1 h-3.5 w-3.5" />
                              )}
                              {sub.status === "active" ? "Pause" : "Activer"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* ----------------------------------------------------------------- */}
          {/* Tab: Factures                                                     */}
          {/* ----------------------------------------------------------------- */}
          <TabsContent value="invoices" className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => setGenDialogOpen(true)}
                className="rounded-lg"
              >
                <Receipt className="mr-2 h-4 w-4" />
                Générer les factures du mois
              </Button>
            </div>

            <Card className="border-0 shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-slate-500">N°</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Client</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Période</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Montant TTC</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Statut</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-sm text-slate-400">
                        Aucune facture pour le moment
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((inv) => (
                      <TableRow key={inv.id} className="group">
                        <TableCell>
                          <span className="text-sm font-mono text-slate-700">
                            {inv.invoiceNumber}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium text-slate-900">
                            {inv.subscription.companyName}
                          </p>
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
                                Marquer payé
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
                                Marquer envoyé
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
          </TabsContent>
        </Tabs>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Dialog: Subscription create / edit                                   */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSub ? "Modifier l'abonnement" : "Nouvel abonnement"}
            </DialogTitle>
            <DialogDescription>
              {editingSub
                ? "Modifiez les informations de l'abonnement."
                : "Créez un nouvel abonnement pour une organisation."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Organization selector — only for create */}
            {!editingSub && (
              <div className="grid gap-2">
                <Label htmlFor="orgId">Organisation</Label>
                <Select value={formOrgId} onValueChange={(v) => v && setFormOrgId(v)}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Sélectionner une organisation" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
                <Label htmlFor="companyVat">N° TVA</Label>
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
                <Label htmlFor="monthlyPrice">Montant mensuel (€)</Label>
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
                <Label htmlFor="pricePerMinute">Prix par minute (€)</Label>
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
                <Select value={formFreeTrialType} onValueChange={(v) => v && setFormFreeTrialType(v)}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    <SelectItem value="subscription_only">Abonnement offert</SelectItem>
                    <SelectItem value="minutes_only">Minutes offertes</SelectItem>
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
              disabled={isPending || (!editingSub && !formOrgId) || !formCompanyName}
              onClick={handleSubmitSubscription}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingSub ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Dialog: Generate monthly invoices                                    */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={genDialogOpen} onOpenChange={setGenDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Générer les factures</DialogTitle>
            <DialogDescription>
              Sélectionnez le mois et l&apos;année pour générer les factures de tous les abonnements actifs.
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
              <Label htmlFor="genYear">Année</Label>
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
              onClick={handleGenerateInvoices}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Générer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
