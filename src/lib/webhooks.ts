import { prisma } from "./prisma";

interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export async function dispatchWebhooks(userId: string, payload: WebhookPayload) {
  const integrations = await prisma.integration.findMany({
    where: {
      userId,
      type: "webhook",
      enabled: true,
    },
  });

  const results = await Promise.allSettled(
    integrations.map(async (integration) => {
      const config = integration.config as { url?: string; secret?: string };
      if (!config.url) return;

      const response = await fetch(config.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.secret
            ? { "X-Webhook-Secret": config.secret }
            : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
    })
  );

  return results;
}
