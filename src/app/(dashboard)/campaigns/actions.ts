"use server";

import { prisma } from "@/lib/prisma";
import { getOrgContext, orgFilter } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
      _count: { select: { contacts: true } },
    },
  });

  if (!campaign) throw new Error("Campaign not found");
  if (!campaign.agent.retellAgentId) {
    throw new Error("L'agent doit etre publie avant de lancer la campagne");
  }
  if (campaign._count.contacts === 0) {
    throw new Error("Aucun contact a appeler");
  }

  const phoneNumberIds = (campaign.phoneNumberIds as string[]) || [];
  if (phoneNumberIds.length === 0) {
    throw new Error("Aucun numero de telephone configure pour cette campagne");
  }

  // Set campaign to running — the engine will handle batching
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "running", startedAt: new Date() },
  });

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
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
  revalidatePath("/campaigns");
}

export async function resumeCampaign(campaignId: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "campaigns:launch")) {
    throw new Error("Permission denied");
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId: ctx.userId, ...orgFilter(ctx) },
  });

  if (!campaign) throw new Error("Campaign not found");
  if (campaign.status !== "paused") {
    throw new Error("La campagne n'est pas en pause");
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "running" },
  });

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
}

export async function getCampaignStats(campaignId: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "campaigns:read")) {
    throw new Error("Permission denied");
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, ...orgFilter(ctx) },
  });
  if (!campaign) throw new Error("Campaign not found");

  const totalContacts = await prisma.contact.count({
    where: { campaignId },
  });

  const [completed, failed, noAnswer, pending, inProgress] = await Promise.all([
    prisma.call.count({ where: { campaignId, status: "completed" } }),
    prisma.call.count({ where: { campaignId, status: "failed" } }),
    prisma.call.count({ where: { campaignId, status: "no_answer" } }),
    prisma.call.count({ where: { campaignId, status: "pending" } }),
    prisma.call.count({ where: { campaignId, status: "in_progress" } }),
  ]);

  // Contacts that have been called at least once
  const calledContacts = await prisma.contact.count({
    where: {
      campaignId,
      calls: { some: { campaignId } },
    },
  });

  // Average duration of completed calls
  const avgDurationResult = await prisma.call.aggregate({
    where: { campaignId, status: "completed", duration: { not: null } },
    _avg: { duration: true },
  });

  // Score breakdown
  const [hot, warm, cold] = await Promise.all([
    prisma.contact.count({ where: { campaignId, scoreLabel: "hot" } }),
    prisma.contact.count({ where: { campaignId, scoreLabel: "warm" } }),
    prisma.contact.count({ where: { campaignId, scoreLabel: "cold" } }),
  ]);

  const totalAttempted = completed + failed + noAnswer;
  const successRate = totalAttempted > 0 ? Math.round((completed / totalAttempted) * 100) : 0;
  const completionPercent = totalContacts > 0 ? Math.round((calledContacts / totalContacts) * 100) : 0;

  return {
    totalContacts,
    calledContacts,
    completed,
    failed,
    noAnswer,
    pending,
    inProgress,
    avgDuration: Math.round(avgDurationResult._avg.duration || 0),
    successRate,
    completionPercent,
    hot,
    warm,
    cold,
  };
}

export async function addContactsToCampaign(
  campaignId: string,
  contactIds: string[]
) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "campaigns:update")) {
    throw new Error("Permission denied");
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId: ctx.userId, ...orgFilter(ctx) },
  });
  if (!campaign) throw new Error("Campaign not found");

  // Update existing CRM contacts to link them to this campaign
  await prisma.contact.updateMany({
    where: {
      id: { in: contactIds },
      // Ensure contacts belong to the same org
      ...(ctx.orgId ? { orgId: ctx.orgId } : {}),
    },
    data: { campaignId },
  });

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
}

export async function deleteCampaignAction(id: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "campaigns:delete")) {
    throw new Error("Permission denied");
  }

  await prisma.campaign.delete({
    where: { id, userId: ctx.userId, ...orgFilter(ctx) },
  });

  revalidatePath("/campaigns");
}
