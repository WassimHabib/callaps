"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
