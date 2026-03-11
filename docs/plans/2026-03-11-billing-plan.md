# Système de Facturation Callaps — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Système de facturation avec abonnements par client, facturation à la minute, factures conformes en PDF.

**Architecture:** Modèles Subscription et Invoice en Prisma, liés par orgId (Clerk). Le super_admin configure les tarifs côté admin, le système calcule les factures mensuelles (abo + minutes). Les clients voient leur conso et téléchargent les PDF.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Server Actions, jsPDF pour les PDF

---

### Task 1: Modèles Prisma — Subscription & Invoice

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Ajouter les enums et modèles**

Ajouter à la fin du fichier `prisma/schema.prisma` :

```prisma
enum SubscriptionStatus {
  active
  paused
  cancelled
}

enum FreeTrialType {
  none
  subscription_only
  minutes_only
  both
}

enum InvoiceStatus {
  draft
  sent
  paid
  overdue
}

model Subscription {
  id              String             @id @default(cuid())
  orgId           String             @unique
  monthlyPrice    Int                // centimes (ex: 29900 = 299€)
  pricePerMinute  Int                // centimes (ex: 15 = 0.15€)
  freeTrialType   FreeTrialType      @default(none)
  freeTrialMonths Int                @default(1)
  startDate       DateTime           @default(now())
  status          SubscriptionStatus @default(active)
  // Infos légales client
  companyName     String
  companyAddress  String?
  companySiret    String?
  companyVat      String?
  notes           String?
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  invoices Invoice[]

  @@map("subscriptions")
}

model Invoice {
  id                 String        @id @default(cuid())
  invoiceNumber      String        @unique // INV-2026-0001
  orgId              String
  subscriptionId     String
  subscription       Subscription  @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  periodMonth        Int           // 1-12
  periodYear         Int
  subscriptionAmount Int           // centimes
  minutesUsed        Int           // secondes totales
  minutesAmount      Int           // centimes
  totalHT            Int           // centimes
  tvaRate            Int           @default(2000) // 2000 = 20.00%
  tvaAmount          Int           // centimes
  totalTTC           Int           // centimes
  status             InvoiceStatus @default(draft)
  paidAt             DateTime?
  createdAt          DateTime      @default(now())

  @@unique([orgId, periodMonth, periodYear])
  @@map("invoices")
}
```

**Step 2: Générer et migrer**

```bash
npx prisma generate
npx prisma db push
```

**Step 3: Commit**

```bash
git add prisma/schema.prisma src/generated/prisma
git commit -m "feat(billing): add Subscription and Invoice models"
```

---

### Task 2: Logique de facturation — billing lib

**Files:**
- Create: `src/lib/billing.ts`

**Step 1: Créer les fonctions de calcul**

```typescript
"use server";

import { prisma } from "./prisma";

/**
 * Get total call duration in seconds for an org during a specific month
 */
export async function getMonthlyUsage(orgId: string, month: number, year: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const result = await prisma.call.aggregate({
    where: {
      OR: [
        { campaign: { orgId }, createdAt: { gte: startDate, lt: endDate } },
        { orgId, createdAt: { gte: startDate, lt: endDate } },
      ],
      status: "completed",
      duration: { not: null },
    },
    _sum: { duration: true },
    _count: true,
  });

  return {
    totalSeconds: result._sum.duration ?? 0,
    totalMinutes: Math.ceil((result._sum.duration ?? 0) / 60),
    callCount: result._count,
  };
}

/**
 * Check if org is in free trial period for a given month/year
 */
function isInFreeTrial(
  subscription: { startDate: Date; freeTrialType: string; freeTrialMonths: number },
  month: number,
  year: number
): { freeSubscription: boolean; freeMinutes: boolean } {
  if (subscription.freeTrialType === "none") {
    return { freeSubscription: false, freeMinutes: false };
  }

  const start = subscription.startDate;
  const startMonth = start.getFullYear() * 12 + start.getMonth();
  const targetMonth = year * 12 + (month - 1);
  const monthsElapsed = targetMonth - startMonth;

  if (monthsElapsed >= subscription.freeTrialMonths) {
    return { freeSubscription: false, freeMinutes: false };
  }

  return {
    freeSubscription: ["subscription_only", "both"].includes(subscription.freeTrialType),
    freeMinutes: ["minutes_only", "both"].includes(subscription.freeTrialType),
  };
}

/**
 * Generate next sequential invoice number
 */
async function getNextInvoiceNumber(year: number): Promise<string> {
  const lastInvoice = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: `INV-${year}-` } },
    orderBy: { invoiceNumber: "desc" },
  });

  let seq = 1;
  if (lastInvoice) {
    const parts = lastInvoice.invoiceNumber.split("-");
    seq = parseInt(parts[2], 10) + 1;
  }

  return `INV-${year}-${seq.toString().padStart(4, "0")}`;
}

/**
 * Calculate and create invoice for a single org
 */
export async function generateInvoice(orgId: string, month: number, year: number) {
  // Check if invoice already exists
  const existing = await prisma.invoice.findUnique({
    where: { orgId_periodMonth_periodYear: { orgId, periodMonth: month, periodYear: year } },
  });
  if (existing) return { success: false, message: "Facture déjà générée pour cette période" };

  const subscription = await prisma.subscription.findUnique({ where: { orgId } });
  if (!subscription || subscription.status !== "active") {
    return { success: false, message: "Aucun abonnement actif" };
  }

  const usage = await getMonthlyUsage(orgId, month, year);
  const trial = isInFreeTrial(subscription, month, year);

  const subscriptionAmount = trial.freeSubscription ? 0 : subscription.monthlyPrice;
  const minutesAmount = trial.freeMinutes ? 0 : usage.totalMinutes * subscription.pricePerMinute;
  const totalHT = subscriptionAmount + minutesAmount;
  const tvaRate = 2000; // 20%
  const tvaAmount = Math.round(totalHT * tvaRate / 10000);
  const totalTTC = totalHT + tvaAmount;

  const invoiceNumber = await getNextInvoiceNumber(year);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      orgId,
      subscriptionId: subscription.id,
      periodMonth: month,
      periodYear: year,
      subscriptionAmount,
      minutesUsed: usage.totalSeconds,
      minutesAmount,
      totalHT,
      tvaRate,
      tvaAmount,
      totalTTC,
    },
  });

  return { success: true, invoice };
}

/**
 * Generate invoices for all active subscriptions
 */
export async function generateAllInvoices(month: number, year: number) {
  const subscriptions = await prisma.subscription.findMany({
    where: { status: "active" },
  });

  const results = [];
  for (const sub of subscriptions) {
    const result = await generateInvoice(sub.orgId, month, year);
    results.push({ orgId: sub.orgId, ...result });
  }

  return results;
}

/**
 * Get current month usage for an org (for client dashboard)
 */
export async function getCurrentMonthUsage(orgId: string) {
  const now = new Date();
  return getMonthlyUsage(orgId, now.getMonth() + 1, now.getFullYear());
}

/**
 * Format centimes to euros string
 */
export function formatCentimes(centimes: number): string {
  return (centimes / 100).toFixed(2).replace(".", ",") + " €";
}
```

**Step 2: Commit**

```bash
git add src/lib/billing.ts
git commit -m "feat(billing): add billing calculation logic"
```

---

### Task 3: Admin — Server Actions billing

**Files:**
- Create: `src/app/(dashboard)/admin/billing/actions.ts`

**Step 1: Créer les actions admin**

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { generateAllInvoices, generateInvoice } from "@/lib/billing";
import { revalidatePath } from "next/cache";

// Auth helper — only super_admin
async function requireSuperAdmin() {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) throw new Error("Non authentifié");
  const user = await prisma.user.findFirst({ where: { clerkId: userId } });
  if (!user || user.role !== "super_admin") throw new Error("Accès refusé");
  return user;
}

// ---- Subscriptions ----

export async function getSubscriptions() {
  await requireSuperAdmin();
  return prisma.subscription.findMany({
    include: { _count: { select: { invoices: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSubscription(orgId: string) {
  await requireSuperAdmin();
  return prisma.subscription.findUnique({ where: { orgId } });
}

export async function upsertSubscription(data: {
  orgId: string;
  monthlyPrice: number;
  pricePerMinute: number;
  freeTrialType: "none" | "subscription_only" | "minutes_only" | "both";
  freeTrialMonths: number;
  companyName: string;
  companyAddress?: string;
  companySiret?: string;
  companyVat?: string;
  notes?: string;
}) {
  await requireSuperAdmin();

  const subscription = await prisma.subscription.upsert({
    where: { orgId: data.orgId },
    create: {
      orgId: data.orgId,
      monthlyPrice: data.monthlyPrice,
      pricePerMinute: data.pricePerMinute,
      freeTrialType: data.freeTrialType,
      freeTrialMonths: data.freeTrialMonths,
      companyName: data.companyName,
      companyAddress: data.companyAddress,
      companySiret: data.companySiret,
      companyVat: data.companyVat,
      notes: data.notes,
    },
    update: {
      monthlyPrice: data.monthlyPrice,
      pricePerMinute: data.pricePerMinute,
      freeTrialType: data.freeTrialType,
      freeTrialMonths: data.freeTrialMonths,
      companyName: data.companyName,
      companyAddress: data.companyAddress,
      companySiret: data.companySiret,
      companyVat: data.companyVat,
      notes: data.notes,
    },
  });

  revalidatePath("/admin/billing");
  return subscription;
}

export async function pauseSubscription(orgId: string) {
  await requireSuperAdmin();
  await prisma.subscription.update({ where: { orgId }, data: { status: "paused" } });
  revalidatePath("/admin/billing");
}

export async function activateSubscription(orgId: string) {
  await requireSuperAdmin();
  await prisma.subscription.update({ where: { orgId }, data: { status: "active" } });
  revalidatePath("/admin/billing");
}

// ---- Invoices ----

export async function getAllInvoices() {
  await requireSuperAdmin();
  return prisma.invoice.findMany({
    include: { subscription: { select: { companyName: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrgInvoices(orgId: string) {
  await requireSuperAdmin();
  return prisma.invoice.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });
}

export async function generateMonthlyInvoices(month: number, year: number) {
  await requireSuperAdmin();
  const results = await generateAllInvoices(month, year);
  revalidatePath("/admin/billing");
  return results;
}

export async function generateSingleInvoice(orgId: string, month: number, year: number) {
  await requireSuperAdmin();
  const result = await generateInvoice(orgId, month, year);
  revalidatePath("/admin/billing");
  return result;
}

export async function markInvoicePaid(invoiceId: string) {
  await requireSuperAdmin();
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "paid", paidAt: new Date() },
  });
  revalidatePath("/admin/billing");
}

export async function markInvoiceSent(invoiceId: string) {
  await requireSuperAdmin();
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "sent" },
  });
  revalidatePath("/admin/billing");
}

export async function markInvoiceOverdue(invoiceId: string) {
  await requireSuperAdmin();
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "overdue" },
  });
  revalidatePath("/admin/billing");
}
```

**Step 2: Commit**

```bash
git add src/app/\(dashboard\)/admin/billing/actions.ts
git commit -m "feat(billing): add admin server actions for subscriptions and invoices"
```

---

### Task 4: Admin — Page listing abonnements & factures

**Files:**
- Create: `src/app/(dashboard)/admin/billing/page.tsx`
- Create: `src/app/(dashboard)/admin/billing/billing-admin.tsx`

**Step 1: Créer la page serveur**

`src/app/(dashboard)/admin/billing/page.tsx`:
```typescript
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BillingAdmin } from "./billing-admin";

async function requireSuperAdmin() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const user = await prisma.user.findFirst({ where: { clerkId: userId } });
  if (!user || user.role !== "super_admin") redirect("/dashboard");
  return user;
}

export default async function AdminBillingPage() {
  await requireSuperAdmin();

  const [subscriptions, invoices] = await Promise.all([
    prisma.subscription.findMany({
      include: { _count: { select: { invoices: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.findMany({
      include: { subscription: { select: { companyName: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  // Get org list from Clerk for the "new subscription" dropdown
  const { clerkClient } = await import("@clerk/nextjs/server");
  const clerk = await clerkClient();
  const orgsResponse = await clerk.organizations.getOrganizationList({ limit: 100 });
  const organizations = orgsResponse.data.map((o) => ({
    id: o.id,
    name: o.name,
  }));

  return (
    <BillingAdmin
      subscriptions={JSON.parse(JSON.stringify(subscriptions))}
      invoices={JSON.parse(JSON.stringify(invoices))}
      organizations={organizations}
    />
  );
}
```

**Step 2: Créer le composant client BillingAdmin**

`src/app/(dashboard)/admin/billing/billing-admin.tsx` — C'est un gros composant. Il affiche :

- 3 stats cards : abonnements actifs, CA mensuel estimé, factures impayées
- Onglets : "Abonnements" et "Factures"
- Tab Abonnements : table avec orgName, montant/mois, prix/min, statut, actions (modifier, pause/activer)
- Tab Factures : table avec numéro, client, période, montant TTC, statut, actions (marquer payé/envoyé)
- Dialog pour créer/modifier un abonnement
- Bouton "Générer les factures du mois"

Ce fichier est volumineux (~500 lignes). Le contenu complet sera dans l'implémentation.

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/admin/billing/
git commit -m "feat(billing): add admin billing page with subscriptions and invoices"
```

---

### Task 5: Admin — Page détail billing par org

**Files:**
- Create: `src/app/(dashboard)/admin/billing/[orgId]/page.tsx`

**Step 1: Créer la page détail**

Page qui affiche pour un orgId donné :
- Les infos de l'abonnement (modifiable)
- La consommation du mois en cours (minutes, montant estimé)
- L'historique des factures avec actions (marquer payé, etc.)

**Step 2: Commit**

```bash
git add src/app/\(dashboard\)/admin/billing/\[orgId\]/
git commit -m "feat(billing): add per-org billing detail page"
```

---

### Task 6: Client — Page facturation

**Files:**
- Create: `src/app/(dashboard)/billing/page.tsx`
- Create: `src/app/(dashboard)/billing/actions.ts`
- Create: `src/app/(dashboard)/billing/billing-client.tsx`

**Step 1: Créer les actions client**

`src/app/(dashboard)/billing/actions.ts`:
```typescript
"use server";

import { getOrgContext } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getCurrentMonthUsage } from "@/lib/billing";

export async function getClientBillingData() {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "billing:read")) {
    return null;
  }
  if (!ctx.orgId) return null;

  const [subscription, invoices, usage] = await Promise.all([
    prisma.subscription.findUnique({ where: { orgId: ctx.orgId } }),
    prisma.invoice.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: "desc" },
    }),
    getCurrentMonthUsage(ctx.orgId),
  ]);

  return {
    subscription: subscription ? JSON.parse(JSON.stringify(subscription)) : null,
    invoices: JSON.parse(JSON.stringify(invoices)),
    usage,
  };
}
```

**Step 2: Créer la page serveur et le composant client**

La page affiche :
- Carte "Consommation du mois" : minutes utilisées, montant estimé
- Carte "Mon abonnement" : montant mensuel, prix/min, statut
- Table des factures avec bouton "Télécharger PDF"

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/billing/
git commit -m "feat(billing): add client billing page with usage and invoices"
```

---

### Task 7: Génération PDF des factures

**Files:**
- Create: `src/app/api/invoices/[id]/pdf/route.ts`

**Step 1: Installer jspdf**

```bash
npm install jspdf
```

**Step 2: Créer la route API**

`src/app/api/invoices/[id]/pdf/route.ts`:

Route GET qui :
1. Vérifie l'auth (super_admin ou org_admin du bon orgId)
2. Récupère l'invoice + subscription
3. Génère un PDF avec jsPDF contenant :
   - En-tête avec "FACTURE" + numéro + date
   - Infos émetteur (Callaps / WH Consulting)
   - Infos client (companyName, address, SIRET)
   - Tableau : Abonnement mensuel, Minutes consommées (X min × Y€/min)
   - Total HT, TVA 20%, Total TTC
   - Mentions légales
4. Retourne le PDF en Response avec headers Content-Type + Content-Disposition

**Step 3: Commit**

```bash
git add src/app/api/invoices/\[id\]/pdf/route.ts package.json package-lock.json
git commit -m "feat(billing): add PDF invoice generation API"
```

---

### Task 8: Navigation — Sidebar updates

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

**Step 1: Ajouter les liens billing**

- Admin sidebar : ajouter "Facturation" avec icône `Receipt` → `/admin/billing`
- Client sidebar : ajouter "Facturation" avec icône `Receipt` → `/billing`

**Step 2: Commit**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "feat(billing): add billing links to sidebar navigation"
```

---

### Task 9: Migration DB + Prisma generate + Push final

**Step 1: Régénérer le client Prisma**

```bash
npx prisma generate
npx prisma db push
```

**Step 2: Vérifier le build**

```bash
npm run build
```

**Step 3: Commit et push**

```bash
git add -A
git commit -m "feat(billing): complete billing system — subscriptions, invoices, PDF"
git push origin main
```
