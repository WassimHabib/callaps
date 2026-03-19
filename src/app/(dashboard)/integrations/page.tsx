import { getOrgContext, orgFilter } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { PageNav } from "@/components/layout/page-nav";
import { IntegrationCards } from "./integration-cards";
import { WebhooksSection } from "./webhooks-section";

export default async function IntegrationsPage() {
  const ctx = await getOrgContext();
  const canManage = hasPermission(ctx.role, "integrations:manage");

  const userIntegrations = await prisma.integration.findMany({
    where: { userId: ctx.userId },
    select: { id: true, type: true, enabled: true },
  });

  // Fetch webhook configs for current user/org
  const webhooks = await prisma.webhookConfig.findMany({
    where: { ...orgFilter(ctx), userId: ctx.userId },
    orderBy: { createdAt: "desc" },
  });

  // Fetch last log for each webhook
  const webhookIds = webhooks.map((w) => w.id);
  const lastLogs = webhookIds.length > 0
    ? await prisma.webhookLog.findMany({
        where: { webhookId: { in: webhookIds } },
        orderBy: { createdAt: "desc" },
        distinct: ["webhookId"],
        select: { webhookId: true, success: true, statusCode: true, createdAt: true },
      })
    : [];

  const lastLogMap = new Map(lastLogs.map((l) => [l.webhookId, l]));

  const webhooksWithDelivery = webhooks.map((w) => ({
    ...w,
    lastDelivery: lastLogMap.get(w.id) || null,
  }));

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header title="Integrations" description="Connectez vos outils et CRM" />
      <PageNav items={[
        { href: "/settings", label: "Paramètres" },
        { href: "/integrations", label: "Intégrations" },
      ]} />
      <div className="p-8 space-y-8">
        <IntegrationCards
          connectedIntegrations={userIntegrations}
          canManage={canManage}
        />

        <WebhooksSection
          initialWebhooks={webhooksWithDelivery}
          canManage={canManage}
        />
      </div>
    </div>
  );
}
