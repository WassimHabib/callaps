import { getOrgContext } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentMonthUsage } from "@/lib/billing";
import { BillingClient } from "./billing-client";

export default async function BillingPage() {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "billing:read")) redirect("/dashboard");
  if (!ctx.orgId) redirect("/dashboard");

  const [subscription, invoices, usage] = await Promise.all([
    prisma.subscription.findUnique({ where: { orgId: ctx.orgId } }),
    prisma.invoice.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: "desc" },
    }),
    getCurrentMonthUsage(ctx.orgId),
  ]);

  return (
    <BillingClient
      subscription={subscription ? JSON.parse(JSON.stringify(subscription)) : null}
      invoices={JSON.parse(JSON.stringify(invoices))}
      usage={usage}
    />
  );
}
