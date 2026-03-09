"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAssistant,
  updateAssistant,
  deleteAssistant as deleteVapiAssistant,
} from "@/lib/vapi";

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

function langToTranscriberLang(lang: string): string {
  const map: Record<string, string> = {
    "fr-FR": "fr",
    "en-US": "en",
    "en-GB": "en",
    "es-ES": "es",
    "de-DE": "de",
    "ar-SA": "ar",
    "pt-BR": "pt",
    "it-IT": "it",
    "nl-NL": "nl",
  };
  return map[lang] || "fr";
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

  const agent = await prisma.agent.update({
    where: { id, userId: user.id },
    data,
  });

  // Si déjà publié sur Vapi, sync les changements
  if (agent.vapiAssistantId) {
    await updateAssistant(agent.vapiAssistantId, {
      name: data.name,
      model: {
        provider: "openai",
        model: data.llmModel,
        systemMessage: data.systemPrompt,
      },
      voice: {
        provider: data.voiceProvider,
        voiceId: data.voiceId || "camille",
        speed: data.voiceSpeed,
        stability: data.voiceStability,
      },
      firstMessage: data.firstMessage || undefined,
      maxDurationSeconds: data.maxCallDuration,
      silenceTimeoutSeconds: data.silenceTimeout,
      recordingEnabled: data.enableRecording,
    });
  }

  revalidatePath(`/agents/${id}`);
  revalidatePath("/agents");
}

export async function publishAgent(id: string) {
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  const agent = await prisma.agent.findFirst({
    where: { id, userId: user.id },
  });
  if (!agent) throw new Error("Agent not found");

  let vapiAssistantId = agent.vapiAssistantId;

  if (!vapiAssistantId) {
    // Créer l'assistant sur Vapi
    const vapiAssistant = await createAssistant({
      name: agent.name,
      model: {
        provider: "openai",
        model: agent.llmModel,
        systemMessage: agent.systemPrompt,
      },
      voice: {
        provider: agent.voiceProvider,
        voiceId: agent.voiceId || "camille",
        speed: agent.voiceSpeed,
        stability: agent.voiceStability,
      },
      firstMessage: agent.firstMessage || undefined,
      firstMessageMode: agent.firstMessageMode,
      transcriber: {
        provider: "deepgram",
        language: langToTranscriberLang(agent.language),
      },
      maxDurationSeconds: agent.maxCallDuration,
      silenceTimeoutSeconds: agent.silenceTimeout,
      recordingEnabled: agent.enableRecording,
      ...(agent.postCallAnalysis && agent.postCallPrompt
        ? {
            analysisPlan: {
              summaryPrompt: agent.postCallPrompt,
            },
          }
        : {}),
    });

    vapiAssistantId = vapiAssistant.id;
  } else {
    // Mettre à jour l'assistant existant
    await updateAssistant(vapiAssistantId, {
      name: agent.name,
      model: {
        provider: "openai",
        model: agent.llmModel,
        systemMessage: agent.systemPrompt,
      },
      voice: {
        provider: agent.voiceProvider,
        voiceId: agent.voiceId || "camille",
        speed: agent.voiceSpeed,
        stability: agent.voiceStability,
      },
      firstMessage: agent.firstMessage || undefined,
      maxDurationSeconds: agent.maxCallDuration,
      silenceTimeoutSeconds: agent.silenceTimeout,
      recordingEnabled: agent.enableRecording,
    });
  }

  await prisma.agent.update({
    where: { id, userId: user.id },
    data: { published: true, vapiAssistantId },
  });

  revalidatePath(`/agents/${id}`);
  revalidatePath("/agents");
}

export async function deleteAgent(id: string) {
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  const agent = await prisma.agent.findFirst({
    where: { id, userId: user.id },
  });
  if (!agent) throw new Error("Agent not found");

  // Supprimer sur Vapi si publié
  if (agent.vapiAssistantId) {
    try {
      await deleteVapiAssistant(agent.vapiAssistantId);
    } catch {
      // Ignore si déjà supprimé sur Vapi
    }
  }

  await prisma.agent.delete({ where: { id, userId: user.id } });

  revalidatePath("/agents");
  redirect("/agents");
}
