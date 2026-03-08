"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createAgent(formData: FormData) {
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  await prisma.agent.create({
    data: {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      systemPrompt: formData.get("systemPrompt") as string,
      voiceId: (formData.get("voiceId") as string) || null,
      language: (formData.get("language") as string) || "fr-FR",
      userId: user.id,
    },
  });

  revalidatePath("/agents");
  redirect("/agents");
}

export async function updateAgent(id: string, formData: FormData) {
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  await prisma.agent.update({
    where: { id, userId: user.id },
    data: {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      systemPrompt: formData.get("systemPrompt") as string,
      voiceId: (formData.get("voiceId") as string) || null,
      language: (formData.get("language") as string) || "fr-FR",
    },
  });

  revalidatePath("/agents");
  redirect("/agents");
}

export async function deleteAgent(id: string) {
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  await prisma.agent.delete({
    where: { id, userId: user.id },
  });

  revalidatePath("/agents");
}
