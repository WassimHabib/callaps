"use server";

import { prisma } from "@/lib/prisma";
import {
  requireAdminPortal,
  getAccessibleClientIds,
  getAccessibleClientOrgIds,
} from "@/lib/admin-access";
import { formatCentimes } from "@/lib/billing";

export async function getDashboardStats() {
  const ctx = await requireAdminPortal();
  const isSuperAdmin = ctx.userRole === "super_admin";
  const clientIds = await getAccessibleClientIds(ctx.userId, isSuperAdmin);
  const orgIds = await getAccessibleClientOrgIds(ctx.userId, isSuperAdmin);

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    activeClients,
    totalClients,
    subscriptions,
    activeProspects,
    convertedProspects,
    totalProspects,
    contractsPending,
    paymentAlerts,
    overdueInvoices,
    nextActions,
    recentClients,
  ] = await Promise.all([
    prisma.adminClient.count({
      where: { clientId: { in: clientIds }, status: "active" },
    }),
    prisma.adminClient.count({
      where: { clientId: { in: clientIds } },
    }),
    prisma.subscription.findMany({
      where: { orgId: { in: orgIds }, status: "active" },
      select: { monthlyPrice: true },
    }),
    prisma.prospect.count({
      where: {
        adminId: ctx.userId,
        stage: { notIn: ["converted", "lost"] },
      },
    }),
    prisma.prospect.count({
      where: {
        adminId: ctx.userId,
        stage: "converted",
        updatedAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.prospect.count({
      where: {
        adminId: ctx.userId,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.adminClient.count({
      where: { clientId: { in: clientIds }, contractStatus: "sent" },
    }),
    prisma.adminClient.count({
      where: { clientId: { in: clientIds }, paymentStatus: "failed" },
    }),
    prisma.invoice.count({
      where: { orgId: { in: orgIds }, status: "overdue" },
    }),
    prisma.prospect.findMany({
      where: {
        adminId: ctx.userId,
        nextActionDate: { not: null },
        stage: { notIn: ["converted", "lost"] },
      },
      orderBy: { nextActionDate: "asc" },
      take: 5,
      select: {
        id: true,
        name: true,
        company: true,
        nextAction: true,
        nextActionDate: true,
        stage: true,
      },
    }),
    prisma.adminClient.findMany({
      where: { clientId: { in: clientIds } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        client: { select: { id: true, name: true, company: true } },
      },
    }),
  ]);

  const mrr = subscriptions.reduce((sum, s) => sum + s.monthlyPrice, 0);
  const conversionRate =
    totalProspects > 0
      ? Math.round((convertedProspects / totalProspects) * 100)
      : 0;

  return {
    kpis: {
      activeClients,
      totalClients,
      mrr,
      mrrFormatted: formatCentimes(mrr),
      activeProspects,
      conversionRate,
    },
    alerts: {
      contractsPending,
      paymentAlerts: paymentAlerts + overdueInvoices,
    },
    nextActions,
    recentClients,
  };
}
