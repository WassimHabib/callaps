"use server";

import { getOrgContext, orgFilter } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { WebhookEvent } from "@/lib/webhook-delivery";

export async function fetchWebhooks() {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "integrations:read")) {
    throw new Error("Permission denied");
  }

  const webhooks = await prisma.webhookConfig.findMany({
    where: { ...orgFilter(ctx), userId: ctx.userId },
    orderBy: { createdAt: "desc" },
  });

  // Fetch last log for each webhook
  const webhookIds = webhooks.map((w) => w.id);
  const lastLogs = await prisma.webhookLog.findMany({
    where: { webhookId: { in: webhookIds } },
    orderBy: { createdAt: "desc" },
    distinct: ["webhookId"],
    select: { webhookId: true, success: true, statusCode: true, createdAt: true },
  });

  const lastLogMap = new Map(lastLogs.map((l) => [l.webhookId, l]));

  return webhooks.map((w) => ({
    ...w,
    lastDelivery: lastLogMap.get(w.id) || null,
  }));
}

export async function createWebhook(data: {
  name: string;
  url: string;
  secret?: string;
  events: WebhookEvent[];
}) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "integrations:manage")) {
    throw new Error("Permission denied");
  }

  if (!data.name || !data.url || data.events.length === 0) {
    throw new Error("Nom, URL et au moins un événement sont requis");
  }

  await prisma.webhookConfig.create({
    data: {
      name: data.name,
      url: data.url,
      secret: data.secret || null,
      events: data.events,
      userId: ctx.userId,
      orgId: ctx.orgId,
    },
  });

  revalidatePath("/integrations");
}

export async function updateWebhook(
  id: string,
  data: {
    name?: string;
    url?: string;
    secret?: string;
    events?: WebhookEvent[];
  }
) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "integrations:manage")) {
    throw new Error("Permission denied");
  }

  // Verify ownership
  const existing = await prisma.webhookConfig.findFirst({
    where: { id, userId: ctx.userId, ...orgFilter(ctx) },
  });
  if (!existing) throw new Error("Webhook non trouvé");

  await prisma.webhookConfig.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.url !== undefined && { url: data.url }),
      ...(data.secret !== undefined && { secret: data.secret || null }),
      ...(data.events !== undefined && { events: data.events }),
    },
  });

  revalidatePath("/integrations");
}

export async function deleteWebhook(id: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "integrations:manage")) {
    throw new Error("Permission denied");
  }

  const existing = await prisma.webhookConfig.findFirst({
    where: { id, userId: ctx.userId, ...orgFilter(ctx) },
  });
  if (!existing) throw new Error("Webhook non trouvé");

  // Delete logs first
  await prisma.webhookLog.deleteMany({ where: { webhookId: id } });
  await prisma.webhookConfig.delete({ where: { id } });

  revalidatePath("/integrations");
}

export async function toggleWebhook(id: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "integrations:manage")) {
    throw new Error("Permission denied");
  }

  const existing = await prisma.webhookConfig.findFirst({
    where: { id, userId: ctx.userId, ...orgFilter(ctx) },
  });
  if (!existing) throw new Error("Webhook non trouvé");

  await prisma.webhookConfig.update({
    where: { id },
    data: { enabled: !existing.enabled },
  });

  revalidatePath("/integrations");
}

export async function fetchWebhookLogs(webhookId: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "integrations:read")) {
    throw new Error("Permission denied");
  }

  // Verify ownership
  const existing = await prisma.webhookConfig.findFirst({
    where: { id: webhookId, userId: ctx.userId, ...orgFilter(ctx) },
  });
  if (!existing) throw new Error("Webhook non trouvé");

  return prisma.webhookLog.findMany({
    where: { webhookId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function testWebhook(id: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "integrations:manage")) {
    throw new Error("Permission denied");
  }

  const webhook = await prisma.webhookConfig.findFirst({
    where: { id, userId: ctx.userId, ...orgFilter(ctx) },
  });
  if (!webhook) throw new Error("Webhook non trouvé");

  const testPayload = {
    event: "test",
    data: {
      message: "Ceci est un test de webhook depuis Wevlap",
      webhookName: webhook.name,
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  };

  const body = JSON.stringify(testPayload);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Webhook-Event": "test",
  };

  if (webhook.secret) {
    const crypto = await import("crypto");
    headers["X-Webhook-Signature"] = crypto
      .createHmac("sha256", webhook.secret)
      .update(body)
      .digest("hex");
  }

  let statusCode: number | null = null;
  let responseText: string | null = null;
  let success = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(webhook.url, {
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
  }

  await prisma.webhookLog.create({
    data: {
      webhookId: id,
      event: "test",
      payload: testPayload as never,
      statusCode,
      response: responseText ? responseText.slice(0, 2000) : null,
      success,
    },
  });

  revalidatePath("/integrations");

  return { success, statusCode, response: responseText?.slice(0, 500) ?? null };
}
