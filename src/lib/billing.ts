import { prisma } from "./prisma";
import type { Subscription } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MonthlyUsage {
  totalSeconds: number;
  totalMinutes: number; // ceil
  callCount: number;
}

interface FreeTrialResult {
  freeSubscription: boolean;
  freeMinutes: boolean;
}

interface GenerateInvoiceResult {
  success: boolean;
  message?: string;
  invoice?: Awaited<ReturnType<typeof prisma.invoice.create>>;
}

// ---------------------------------------------------------------------------
// 1. getMonthlyUsage
// ---------------------------------------------------------------------------

export async function getMonthlyUsage(
  orgId: string,
  month: number,
  year: number,
): Promise<MonthlyUsage> {
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 1);

  const calls = await prisma.call.findMany({
    where: {
      status: "completed",
      duration: { not: null },
      createdAt: { gte: periodStart, lt: periodEnd },
      OR: [
        // Standalone calls directly owned by the org
        { orgId },
        // Campaign calls where the campaign belongs to the org
        { campaign: { orgId } },
      ],
    },
    select: { duration: true },
  });

  const totalSeconds = calls.reduce(
    (sum, call) => sum + (call.duration ?? 0),
    0,
  );

  return {
    totalSeconds,
    totalMinutes: Math.ceil(totalSeconds / 60),
    callCount: calls.length,
  };
}

// ---------------------------------------------------------------------------
// 2. isInFreeTrial (internal helper)
// ---------------------------------------------------------------------------

export function isInFreeTrial(
  subscription: Pick<
    Subscription,
    "startDate" | "freeTrialMonths" | "freeTrialType"
  >,
  month: number,
  year: number,
): FreeTrialResult {
  const result: FreeTrialResult = {
    freeSubscription: false,
    freeMinutes: false,
  };

  if (
    subscription.freeTrialType === "none" ||
    subscription.freeTrialMonths <= 0
  ) {
    return result;
  }

  // Calculate end of free trial period
  const startDate = new Date(subscription.startDate);
  const trialEndDate = new Date(
    startDate.getFullYear(),
    startDate.getMonth() + subscription.freeTrialMonths,
    1,
  );

  // Target month as a date (first of the month)
  const targetDate = new Date(year, month - 1, 1);

  const isWithinTrial = targetDate < trialEndDate;

  if (!isWithinTrial) {
    return result;
  }

  switch (subscription.freeTrialType) {
    case "subscription_only":
      result.freeSubscription = true;
      break;
    case "minutes_only":
      result.freeMinutes = true;
      break;
    case "both":
      result.freeSubscription = true;
      result.freeMinutes = true;
      break;
  }

  return result;
}

// ---------------------------------------------------------------------------
// 3. getNextInvoiceNumber
// ---------------------------------------------------------------------------

export async function getNextInvoiceNumber(year: number): Promise<string> {
  const prefix = `INV-${year}-`;

  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: { startsWith: prefix },
    },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });

  let nextNumber = 1;

  if (lastInvoice) {
    const parts = lastInvoice.invoiceNumber.split("-");
    const lastNumber = parseInt(parts[2], 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

// ---------------------------------------------------------------------------
// 4. generateInvoice
// ---------------------------------------------------------------------------

const TVA_RATE = 2000; // 20.00%

export async function generateInvoice(
  orgId: string,
  month: number,
  year: number,
): Promise<GenerateInvoiceResult> {
  // Check if invoice already exists for this org/period
  const existing = await prisma.invoice.findUnique({
    where: {
      orgId_periodMonth_periodYear: {
        orgId,
        periodMonth: month,
        periodYear: year,
      },
    },
  });

  if (existing) {
    return {
      success: false,
      message: `Une facture existe déjà pour ${month}/${year} (${existing.invoiceNumber})`,
    };
  }

  // Get the subscription
  const subscription = await prisma.subscription.findUnique({
    where: { orgId },
  });

  if (!subscription) {
    return {
      success: false,
      message: `Aucun abonnement trouvé pour l'organisation ${orgId}`,
    };
  }

  // Calculate usage
  const usage = await getMonthlyUsage(orgId, month, year);

  // Check free trial
  const trial = isInFreeTrial(subscription, month, year);

  // Calculate amounts (all in centimes)
  const subscriptionAmount = trial.freeSubscription
    ? 0
    : subscription.monthlyPrice;
  const minutesAmount = trial.freeMinutes
    ? 0
    : usage.totalMinutes * subscription.pricePerMinute;
  const totalHT = subscriptionAmount + minutesAmount;
  const tvaAmount = Math.round((totalHT * TVA_RATE) / 10000);
  const totalTTC = totalHT + tvaAmount;

  // Generate invoice number
  const invoiceNumber = await getNextInvoiceNumber(year);

  // Create the invoice
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
      tvaRate: TVA_RATE,
      tvaAmount,
      totalTTC,
      status: "draft",
    },
  });

  return { success: true, invoice };
}

// ---------------------------------------------------------------------------
// 5. generateAllInvoices
// ---------------------------------------------------------------------------

export async function generateAllInvoices(
  month: number,
  year: number,
): Promise<GenerateInvoiceResult[]> {
  const subscriptions = await prisma.subscription.findMany({
    where: { status: "active" },
    select: { orgId: true },
  });

  const results: GenerateInvoiceResult[] = [];

  for (const sub of subscriptions) {
    const result = await generateInvoice(sub.orgId, month, year);
    results.push(result);
  }

  return results;
}

// ---------------------------------------------------------------------------
// 6. getCurrentMonthUsage
// ---------------------------------------------------------------------------

export async function getCurrentMonthUsage(
  orgId: string,
): Promise<MonthlyUsage> {
  const now = new Date();
  return getMonthlyUsage(orgId, now.getMonth() + 1, now.getFullYear());
}

// ---------------------------------------------------------------------------
// 7. formatCentimes
// ---------------------------------------------------------------------------

export function formatCentimes(centimes: number): string {
  const euros = (centimes / 100).toFixed(2).replace(".", ",");
  return `${euros} €`;
}
