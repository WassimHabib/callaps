"use server";

import { getOrgContext } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getCurrentMonthUsage } from "@/lib/billing";

export async function getClientBillingData() {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "billing:read")) return null;
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
