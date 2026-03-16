import { Header } from "@/components/layout/header";
import { ClientDetail } from "@/components/admin-portal/client-detail";
import { getAdminClient } from "../actions";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let adminClient;
  try {
    adminClient = await getAdminClient(id);
  } catch {
    notFound();
  }

  const orgId = adminClient.clientOrgId;

  const [subscription, invoices, agentCount, campaignCount, callCount] =
    await Promise.all([
      prisma.subscription.findUnique({ where: { orgId } }),
      prisma.invoice.findMany({
        where: { orgId },
        select: { status: true, totalTTC: true },
      }),
      prisma.agent.count({ where: { userId: id } }),
      prisma.campaign.count({ where: { userId: id } }),
      prisma.call.count({ where: { orgId } }),
    ]);

  const invoicesSummary = {
    total: invoices.length,
    paid: invoices.filter((i) => i.status === "paid").length,
    overdue: invoices.filter((i) => i.status === "overdue").length,
    totalAmount: invoices.reduce((sum, i) => sum + i.totalTTC, 0),
  };

  const clientStats = {
    agents: agentCount,
    campaigns: campaignCount,
    calls: callCount,
  };

  return (
    <>
      <Header
        title={adminClient.client.name}
        description={adminClient.client.company || adminClient.client.email}
      />
      <ClientDetail
        adminClient={adminClient}
        subscription={
          subscription
            ? {
                monthlyPrice: subscription.monthlyPrice,
                status: subscription.status,
                pricePerMinute: subscription.pricePerMinute,
              }
            : null
        }
        invoicesSummary={invoicesSummary}
        clientStats={clientStats}
      />
    </>
  );
}
