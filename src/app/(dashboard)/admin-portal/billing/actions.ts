"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  requireAdminPortal,
  canAccessClient,
  hasMinPermission,
  getAccessibleClientOrgIds,
} from "@/lib/admin-access";
import { generateInvoice, formatCentimes } from "@/lib/billing";

export async function fetchBillingOverview() {
  const ctx = await requireAdminPortal();
  const orgIds = await getAccessibleClientOrgIds(
    ctx.userId,
    ctx.userRole === "super_admin"
  );

  const [subscriptions, invoices, adminClients] = await Promise.all([
    prisma.subscription.findMany({
      where: { orgId: { in: orgIds } },
    }),
    prisma.invoice.findMany({
      where: { orgId: { in: orgIds } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.adminClient.findMany({
      where: { clientOrgId: { in: orgIds } },
      include: {
        client: {
          select: { id: true, name: true, company: true },
        },
      },
    }),
  ]);

  // Build a map orgId -> client info
  const clientMap = new Map(
    adminClients.map((ac) => [
      ac.clientOrgId,
      { name: ac.client.name, company: ac.client.company, clientId: ac.clientId },
    ])
  );

  // KPIs
  const activeSubscriptions = subscriptions.filter(
    (s) => s.status === "active"
  );
  const mrr = activeSubscriptions.reduce(
    (sum, s) => sum + s.monthlyPrice,
    0
  );
  const unpaidInvoices = invoices.filter(
    (i) => i.status === "overdue" || i.status === "sent"
  );
  const unpaidAmount = unpaidInvoices.reduce(
    (sum, i) => sum + i.totalTTC,
    0
  );

  return {
    kpis: {
      mrr,
      mrrFormatted: formatCentimes(mrr),
      unpaidCount: unpaidInvoices.length,
      unpaidAmount: formatCentimes(unpaidAmount),
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
    },
    subscriptions: subscriptions.map((s) => ({
      ...s,
      client: clientMap.get(s.orgId) || null,
    })),
    recentInvoices: invoices.map((i) => ({
      ...i,
      client: clientMap.get(i.orgId) || null,
    })),
  };
}

export async function adminGenerateInvoice(
  clientId: string,
  month: number,
  year: number
) {
  const ctx = await requireAdminPortal();
  const access = await canAccessClient(
    ctx.userId,
    clientId,
    ctx.userRole === "super_admin"
  );
  if (!access.access || !hasMinPermission(access.permission, "manage")) {
    throw new Error("Permission insuffisante");
  }

  const adminClient = await prisma.adminClient.findFirst({
    where: { clientId },
  });
  if (!adminClient) throw new Error("Client non trouvé");

  const result = await generateInvoice(adminClient.clientOrgId, month, year);
  revalidatePath("/admin-portal/billing");
  return result;
}

export async function adminUpdateInvoiceStatus(
  invoiceId: string,
  status: "sent" | "paid" | "overdue"
) {
  const ctx = await requireAdminPortal();

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });
  if (!invoice) throw new Error("Facture non trouvée");

  // Verify admin has access to this org
  const adminClient = await prisma.adminClient.findFirst({
    where: { clientOrgId: invoice.orgId },
  });
  if (!adminClient) throw new Error("Accès refusé");

  const access = await canAccessClient(
    ctx.userId,
    adminClient.clientId,
    ctx.userRole === "super_admin"
  );
  if (!access.access || !hasMinPermission(access.permission, "manage")) {
    throw new Error("Permission insuffisante");
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status,
      ...(status === "paid" ? { paidAt: new Date() } : {}),
    },
  });

  revalidatePath("/admin-portal/billing");
}

export async function adminUpsertSubscription(
  clientId: string,
  data: {
    monthlyPrice: number;
    pricePerMinute: number;
    companyName?: string;
    freeTrialType?: string;
    freeTrialMonths?: number;
  }
) {
  const ctx = await requireAdminPortal();
  const access = await canAccessClient(
    ctx.userId,
    clientId,
    ctx.userRole === "super_admin"
  );
  if (!access.access || !hasMinPermission(access.permission, "manage")) {
    throw new Error("Permission insuffisante");
  }

  const adminClient = await prisma.adminClient.findFirst({
    where: { clientId },
  });
  if (!adminClient) throw new Error("Client non trouvé");

  const orgId = adminClient.clientOrgId;

  await prisma.subscription.upsert({
    where: { orgId },
    update: {
      monthlyPrice: data.monthlyPrice,
      pricePerMinute: data.pricePerMinute,
      companyName: data.companyName || "",
      freeTrialType: (data.freeTrialType || "none") as "none" | "subscription_only" | "minutes_only" | "both",
      freeTrialMonths: data.freeTrialMonths || 0,
    },
    create: {
      orgId,
      monthlyPrice: data.monthlyPrice,
      pricePerMinute: data.pricePerMinute,
      companyName: data.companyName || "",
      status: "active",
      startDate: new Date(),
      freeTrialType: (data.freeTrialType || "none") as "none" | "subscription_only" | "minutes_only" | "both",
      freeTrialMonths: data.freeTrialMonths || 0,
    },
  });

  revalidatePath("/admin-portal/billing");
  revalidatePath(`/admin-portal/clients/${clientId}`);
}
