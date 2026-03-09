"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function extractAgentData(formData: FormData) {
  return {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    systemPrompt: formData.get("systemPrompt") as string,
    firstMessage: (formData.get("firstMessage") as string) || null,
    firstMessageMode: (formData.get("firstMessageMode") as string) || "dynamic",
    llmModel: (formData.get("llmModel") as string) || "gpt-4.1",
    voiceProvider: (formData.get("voiceProvider") as string) || "elevenlabs",
    voiceId: (formData.get("voiceId") as string) || null,
    voiceSpeed: parseFloat((formData.get("voiceSpeed") as string) || "1.0"),
    voiceStability: parseFloat((formData.get("voiceStability") as string) || "0.5"),
    language: (formData.get("language") as string) || "fr-FR",
    maxCallDuration: parseInt((formData.get("maxCallDuration") as string) || "300", 10),
    silenceTimeout: parseInt((formData.get("silenceTimeout") as string) || "10", 10),
    endCallOnSilence: formData.get("endCallOnSilence") === "on",
    enableRecording: formData.get("enableRecording") === "on",
    postCallAnalysis: formData.get("postCallAnalysis") === "on",
    postCallPrompt: (formData.get("postCallPrompt") as string) || null,
    postCallWebhook: (formData.get("postCallWebhook") as string) || null,
    safetyMessage: (formData.get("safetyMessage") as string) || null,
    maxSafetyRetries: parseInt((formData.get("maxSafetyRetries") as string) || "3", 10),
  };
}

export async function createAgent(formData: FormData) {
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  const data = extractAgentData(formData);

  const agent = await prisma.agent.create({
    data: { ...data, userId: user.id },
  });

  revalidatePath("/agents");
  redirect(`/agents/${agent.id}`);
}

export async function updateAgent(id: string, formData: FormData) {
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  const data = extractAgentData(formData);

  await prisma.agent.update({
    where: { id, userId: user.id },
    data,
  });

  revalidatePath(`/agents/${id}`);
  revalidatePath("/agents");
}

export async function publishAgent(id: string) {
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  await prisma.agent.update({
    where: { id, userId: user.id },
    data: { published: true },
  });

  revalidatePath(`/agents/${id}`);
  revalidatePath("/agents");
}

export async function deleteAgent(id: string) {
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  await prisma.agent.delete({
    where: { id, userId: user.id },
  });

  revalidatePath("/agents");
  redirect("/agents");
}
