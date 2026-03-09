"use server";

import { prisma } from "@/lib/prisma";
import { getOrgContext, orgFilter } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createPhoneCall } from "@/lib/retell";

export async function createCampaign(formData: FormData) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "campaigns:create")) {
    throw new Error("Permission denied");
  }

  const campaign = await prisma.campaign.create({
    data: {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      agentId: formData.get("agentId") as string,
      userId: ctx.userId,
      orgId: ctx.orgId,
    },
  });

  revalidatePath("/campaigns");
  redirect(`/campaigns/${campaign.id}`);
}

interface CreateCampaignFullParams {
  name: string;
  agentId: string;
  startDate: string;
  leads: { name: string; phone: string; email?: string }[];
  phoneNumberIds: string[];
  callDays: number[];
  callStartTime: string;
  callEndTime: string;
  timezoneMode: string;
  timezone: string;
  maxRetries: number;
  retryIntervalH: number;
  callRateCount: number;
  callRateMinutes: number;
}

export async function createCampaignFull(params: CreateCampaignFullParams) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "campaigns:create")) {
    throw new Error("Permission denied");
  }

  const campaign = await prisma.campaign.create({
    data: {
      name: params.name,
      agentId: params.agentId,
      userId: ctx.userId,
      orgId: ctx.orgId,
      scheduledAt: params.startDate ? new Date(params.startDate) : null,
      callDays: params.callDays,
      callStartTime: params.callStartTime,
      callEndTime: params.callEndTime,
      timezoneMode: params.timezoneMode,
      timezone: params.timezone,
      maxRetries: params.maxRetries,
      retryIntervalH: params.retryIntervalH,
      callRateCount: params.callRateCount,
      callRateMinutes: params.callRateMinutes,
      phoneNumberIds: params.phoneNumberIds,
    },
  });

  // Import leads if provided
  if (params.leads.length > 0) {
    await prisma.contact.createMany({
      data: params.leads.map((l) => ({
        name: l.name || "Inconnu",
        phone: l.phone,
        email: l.email || null,
        campaignId: campaign.id,
      })),
    });
  }

  revalidatePath("/campaigns");
  return { id: campaign.id };
}

export async function deleteCampaign(id: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "campaigns:delete")) {
    throw new Error("Permission denied");
  }

  await prisma.campaign.delete({
    where: { id, userId: ctx.userId, ...orgFilter(ctx) },
  });

  revalidatePath("/campaigns");
  redirect("/campaigns");
}

export async function importContacts(
  campaignId: string,
  contacts: { name: string; phone: string; email?: string }[]
) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "campaigns:update")) {
    throw new Error("Permission denied");
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId: ctx.userId, ...orgFilter(ctx) },
  });
  if (!campaign) throw new Error("Campaign not found");

  await prisma.contact.createMany({
    data: contacts.map((c) => ({
      name: c.name,
      phone: c.phone,
      email: c.email,
      campaignId,
    })),
  });

  revalidatePath(`/campaigns/${campaignId}`);
}

export async function launchCampaign(campaignId: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "campaigns:launch")) {
    throw new Error("Permission denied");
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId: ctx.userId, ...orgFilter(ctx) },
    include: {
      agent: true,
      contacts: {
        where: {
          calls: { none: {} },
        },
      },
    },
  });

  if (!campaign) throw new Error("Campaign not found");
  if (!campaign.agent.retellAgentId) {
    throw new Error("L'agent doit être publié avant de lancer la campagne");
  }
  if (campaign.contacts.length === 0) {
    throw new Error("Aucun contact à appeler");
  }

  // Get phone numbers for the campaign
  const phoneNumberIds = (campaign.phoneNumberIds as string[]) || [];
  if (phoneNumberIds.length === 0) {
    throw new Error("Aucun numéro de téléphone configuré pour cette campagne");
  }
  const fromNumber = phoneNumberIds[0]; // Use first phone number

  // Mettre la campagne en running
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "running", startedAt: new Date() },
  });

  // Lancer les appels via Retell
  for (const contact of campaign.contacts) {
    try {
      const retellCall = await createPhoneCall({
        from_number: fromNumber,
        to_number: contact.phone,
        override_agent_id: campaign.agent.retellAgentId,
      });

      await prisma.call.create({
        data: {
          retellCallId: retellCall.call_id,
          status: "pending",
          campaignId,
          contactId: contact.id,
        },
      });
    } catch (error) {
      await prisma.call.create({
        data: {
          status: "failed",
          campaignId,
          contactId: contact.id,
          metadata: { error: String(error) },
        },
      });
    }
  }

  revalidatePath(`/campaigns/${campaignId}`);
}

export async function pauseCampaign(campaignId: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "campaigns:update")) {
    throw new Error("Permission denied");
  }

  await prisma.campaign.update({
    where: { id: campaignId, userId: ctx.userId, ...orgFilter(ctx) },
    data: { status: "paused" },
  });

  revalidatePath(`/campaigns/${campaignId}`);
}
