import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export type WebhookEvent =
  | "call_ended"
  | "call_analyzed"
  | "lead_hot"
  | "lead_warm"
  | "lead_cold"
  | "campaign_completed";

export const WEBHOOK_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: "call_ended", label: "Appel terminé" },
  { value: "call_analyzed", label: "Appel analysé" },
  { value: "lead_hot", label: "Lead chaud" },
  { value: "lead_warm", label: "Lead tiède" },
  { value: "lead_cold", label: "Lead froid" },
  { value: "campaign_completed", label: "Campagne terminée" },
];

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

async function sendToWebhook(
  webhookId: string,
  url: string,
  secret: string | null,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Webhook-Event": event,
  };

  if (secret) {
    headers["X-Webhook-Signature"] = signPayload(body, secret);
  }

  let statusCode: number | null = null;
  let responseText: string | null = null;
  let success = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    statusCode = res.status;
    responseText = await res.text().catch(() => null);
    success = res.ok;
  } catch (err) {
    responseText = err instanceof Error ? err.message : String(err);
    success = false;
  }

  try {
    await prisma.webhookLog.create({
      data: {
        webhookId,
        event,
        payload: payload as never,
        statusCode,
        response: responseText ? responseText.slice(0, 2000) : null,
        success,
      },
    });
  } catch (logErr) {
    console.error("[webhook-delivery] Failed to log webhook delivery:", logErr);
  }
}

/**
 * Deliver a webhook event to all matching configs.
 * Runs asynchronously — does not block the caller.
 */
export function deliverWebhook(
  event: WebhookEvent,
  payload: Record<string, unknown>,
  orgId?: string | null
): void {
  // Fire and forget — don't await
  deliverWebhookAsync(event, payload, orgId).catch((err) => {
    console.error("[webhook-delivery] Unexpected error:", err);
  });
}

async function deliverWebhookAsync(
  event: WebhookEvent,
  payload: Record<string, unknown>,
  orgId?: string | null
): Promise<void> {
  const where: Record<string, unknown> = {
    enabled: true,
    events: { has: event },
  };

  if (orgId) {
    where.orgId = orgId;
  }

  const configs = await prisma.webhookConfig.findMany({ where });

  if (configs.length === 0) return;

  await Promise.allSettled(
    configs.map((config) =>
      sendToWebhook(config.id, config.url, config.secret, event, payload)
    )
  );
}
