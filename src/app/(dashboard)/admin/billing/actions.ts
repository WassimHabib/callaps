"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";
import { generateAllInvoices, generateInvoice } from "@/lib/billing";
import type { FreeTrialType } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

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
  freeTrialType: FreeTrialType;
  freeTrialMonths: number;
  companyName: string;
  companyAddress?: string;
  companySiret?: string;
  companyVat?: string;
  notes?: string;
}) {
  await requireSuperAdmin();

  const { orgId, ...fields } = data;

  const result = await prisma.subscription.upsert({
    where: { orgId },
    create: { orgId, ...fields },
    update: fields,
  });

  revalidatePath("/admin/billing");
  return result;
}

export async function pauseSubscription(orgId: string) {
  await requireSuperAdmin();

  const result = await prisma.subscription.update({
    where: { orgId },
    data: { status: "paused" },
  });

  revalidatePath("/admin/billing");
  return result;
}

export async function activateSubscription(orgId: string) {
  await requireSuperAdmin();

  const result = await prisma.subscription.update({
    where: { orgId },
    data: { status: "active" },
  });

  revalidatePath("/admin/billing");
  return result;
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

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

export async function generateSingleInvoice(
  orgId: string,
  month: number,
  year: number,
) {
  await requireSuperAdmin();

  const result = await generateInvoice(orgId, month, year);

  revalidatePath("/admin/billing");
  return result;
}

export async function markInvoicePaid(invoiceId: string) {
  await requireSuperAdmin();

  const result = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "paid", paidAt: new Date() },
  });

  revalidatePath("/admin/billing");
  return result;
}

export async function markInvoiceSent(invoiceId: string) {
  await requireSuperAdmin();

  const result = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "sent" },
  });

  revalidatePath("/admin/billing");
  return result;
}

export async function markInvoiceOverdue(invoiceId: string) {
  await requireSuperAdmin();

  const result = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "overdue" },
  });

  revalidatePath("/admin/billing");
  return result;
}
