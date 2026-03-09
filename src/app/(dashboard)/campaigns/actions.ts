"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createCall } from "@/lib/vapi";

export async function createCampaign(formData: FormData) {
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  const campaign = await prisma.campaign.create({
    data: {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      agentId: formData.get("agentId") as string,
      userId: user.id,
    },
  });

  revalidatePath("/campaigns");
  redirect(`/campaigns/${campaign.id}`);
}

export async function deleteCampaign(id: string) {
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  await prisma.campaign.delete({
    where: { id, userId: user.id },
  });

  revalidatePath("/campaigns");
  redirect("/campaigns");
}

export async function importContacts(
  campaignId: string,
  contacts: { name: string; phone: string; email?: string }[]
) {
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId: user.id },
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
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId: user.id },
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
  if (!campaign.agent.vapiAssistantId) {
    throw new Error("L'agent doit être publié avant de lancer la campagne");
  }
  if (campaign.contacts.length === 0) {
    throw new Error("Aucun contact à appeler");
  }

  // Mettre la campagne en running
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "running", startedAt: new Date() },
  });

  // Lancer les appels via Vapi
  for (const contact of campaign.contacts) {
    try {
      const vapiCall = await createCall({
        assistantId: campaign.agent.vapiAssistantId,
        customer: {
          number: contact.phone,
          name: contact.name,
        },
      });

      await prisma.call.create({
        data: {
          vapiCallId: vapiCall.id,
          status: "pending",
          campaignId,
          contactId: contact.id,
        },
      });
    } catch (error) {
      // Créer un call en échec pour ce contact
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
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  await prisma.campaign.update({
    where: { id: campaignId, userId: user.id },
    data: { status: "paused" },
  });

  revalidatePath(`/campaigns/${campaignId}`);
}
