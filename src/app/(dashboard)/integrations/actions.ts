"use server";

import { getOrgContext } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { testConnection as testHubspot, pullContacts as pullHubspotContacts } from "@/lib/integrations/hubspot";
import { testConnection as testPipedrive, pullContacts as pullPipedriveContacts } from "@/lib/integrations/pipedrive";
import { testConnection as testSlack } from "@/lib/integrations/slack";
import { testConnection as testDoctolib } from "@/lib/integrations/doctolib";

type ActionResult = { success: boolean; message: string; count?: number; integrationId?: string };

export async function connectIntegration(
  type: string,
  config: Record<string, string>
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "integrations:manage")) {
    return { success: false, message: "Permission refusee" };
  }

  // Test connection before saving
  let testResult: { success: boolean; message: string };

  switch (type) {
    case "hubspot":
      if (!config.accessToken) {
        return { success: false, message: "Access Token requis" };
      }
      testResult = await testHubspot(config.accessToken);
      break;

    case "pipedrive":
      if (!config.apiToken || !config.domain) {
        return { success: false, message: "API Token et sous-domaine requis" };
      }
      testResult = await testPipedrive(config.apiToken, config.domain);
      break;

    case "slack":
      if (!config.webhookUrl) {
        return { success: false, message: "URL du Webhook requise" };
      }
      testResult = await testSlack(config.webhookUrl);
      break;

    case "doctolib":
      if (!config.slug) {
        return { success: false, message: "Slug Doctolib requis" };
      }
      testResult = await testDoctolib(config.slug);
      break;

    default:
      return { success: false, message: `Type d'integration non supporte: ${type}` };
  }

  if (!testResult.success) {
    return { success: false, message: testResult.message };
  }

  // Upsert integration record
  const existing = await prisma.integration.findFirst({
    where: { userId: ctx.userId, type },
  });

  let integrationId: string;
  if (existing) {
    await prisma.integration.update({
      where: { id: existing.id },
      data: {
        config: config as Record<string, string>,
        enabled: true,
        name: type,
      },
    });
    integrationId = existing.id;
  } else {
    const created = await prisma.integration.create({
      data: {
        type,
        name: type,
        config: config as Record<string, string>,
        enabled: true,
        userId: ctx.userId,
      },
    });
    integrationId = created.id;
  }

  revalidatePath("/integrations");
  return { success: true, message: testResult.message, integrationId };
}

export async function disconnectIntegration(type: string): Promise<ActionResult> {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "integrations:manage")) {
    return { success: false, message: "Permission refusee" };
  }

  const existing = await prisma.integration.findFirst({
    where: { userId: ctx.userId, type },
  });

  if (!existing) {
    return { success: false, message: "Integration non trouvee" };
  }

  await prisma.integration.delete({ where: { id: existing.id } });

  revalidatePath("/integrations");
  return { success: true, message: "Integration deconnectee avec succes" };
}

export async function getIntegrationStatus(
  type: string
): Promise<{ connected: boolean; config?: Record<string, unknown> }> {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "integrations:read")) {
    return { connected: false };
  }

  const integration = await prisma.integration.findFirst({
    where: { userId: ctx.userId, type },
  });

  if (!integration || !integration.enabled) {
    return { connected: false };
  }

  return {
    connected: true,
    config: integration.config as Record<string, unknown>,
  };
}

export async function testIntegration(type: string): Promise<ActionResult> {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "integrations:manage")) {
    return { success: false, message: "Permission refusee" };
  }

  const integration = await prisma.integration.findFirst({
    where: { userId: ctx.userId, type },
  });

  if (!integration) {
    return { success: false, message: "Integration non trouvee" };
  }

  const config = integration.config as Record<string, string>;

  switch (type) {
    case "hubspot":
      return testHubspot(config.accessToken);

    case "pipedrive":
      return testPipedrive(config.apiToken, config.domain);

    case "slack":
      return testSlack(config.webhookUrl);

    case "doctolib":
      return testDoctolib(config.slug);

    default:
      return { success: false, message: `Type d'integration non supporte: ${type}` };
  }
}

export async function listIntegrations() {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "integrations:read")) {
    return [];
  }

  return prisma.integration.findMany({
    where: { userId: ctx.userId },
    select: { type: true, enabled: true, name: true, createdAt: true },
  });
}

export async function syncContacts(type: string): Promise<ActionResult> {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "integrations:manage")) {
    return { success: false, message: "Permission refusee" };
  }

  const integration = await prisma.integration.findFirst({
    where: { userId: ctx.userId, type },
  });

  if (!integration) {
    return { success: false, message: "Integration non trouvee" };
  }

  const config = integration.config as Record<string, string>;
  let contacts: Array<{
    name: string;
    phone: string;
    email?: string | null;
    company?: string | null;
    notes?: string | null;
  }> = [];

  switch (type) {
    case "hubspot":
      contacts = await pullHubspotContacts(config.accessToken);
      break;

    case "pipedrive":
      contacts = await pullPipedriveContacts(config.apiToken, config.domain);
      break;

    default:
      return {
        success: false,
        message: `La synchronisation de contacts n'est pas disponible pour ${type}`,
      };
  }

  if (contacts.length === 0) {
    return {
      success: true,
      message: "Aucun contact trouve a synchroniser",
      count: 0,
    };
  }

  // Create contacts in DB, skipping duplicates by phone number
  let created = 0;
  for (const contact of contacts) {
    if (!contact.phone) continue;

    const existing = await prisma.contact.findFirst({
      where: {
        phone: contact.phone,
        userId: ctx.userId,
      },
    });

    if (!existing) {
      await prisma.contact.create({
        data: {
          name: contact.name,
          phone: contact.phone,
          email: contact.email || null,
          company: contact.company || null,
          notes: contact.notes || null,
          userId: ctx.userId,
          orgId: ctx.orgId,
        },
      });
      created++;
    }
  }

  revalidatePath("/integrations");
  revalidatePath("/contacts");

  return {
    success: true,
    message: `${created} contact${created > 1 ? "s" : ""} synchronise${created > 1 ? "s" : ""} avec succes`,
    count: created,
  };
}
