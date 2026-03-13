"use server";

import { prisma } from "@/lib/prisma";
import { getOrgContext, orgFilter } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createRetellLlm,
  updateRetellLlm,
  deleteRetellLlm,
  createAgent as createRetellAgent,
  updateAgent as updateRetellAgent,
  deleteAgent as deleteRetellAgent,
  createWebCall,
} from "@/lib/retell";

function extractAgentData(formData: FormData) {
  const get = (key: string) => (formData.get(key) as string | null) ?? "";

  return {
    name: get("name") || "Nouvel agent",
    description: get("description") || null,
    systemPrompt: get("systemPrompt") || "Tu es un assistant vocal.",
    firstMessage: get("firstMessage") || null,
    firstMessageMode: get("firstMessageMode") || "dynamic",
    llmModel: get("llmModel") || "gpt-4.1",
    voiceId: get("voiceId") || "minimax-Camille",
    voiceSpeed: Number(get("voiceSpeed")) || 1.0,
    voiceTemperature: Number(get("voiceTemperature")) || 1.0,
    language: get("language") || "fr-FR",
    maxCallDuration: Number(get("maxCallDuration")) || 300,
    silenceTimeout: Number(get("silenceTimeout")) || 10,
    endCallOnSilence: get("endCallOnSilence") === "on" || get("endCallOnSilence") === "true",
    enableRecording: get("enableRecording") === "on" || get("enableRecording") === "true",
    postCallAnalysis: get("postCallAnalysis") === "on" || get("postCallAnalysis") === "true",
    postCallPrompt: get("postCallPrompt") || null,
    postCallWebhook: get("postCallWebhook") || null,
    safetyMessage: get("safetyMessage") || null,
    maxSafetyRetries: Number(get("maxSafetyRetries")) || 3,
    notificationEmail: get("notificationEmail") || null,
    notificationPhone: get("notificationPhone") || null,
    notificationChannels: (() => {
      try { return JSON.parse(get("notificationChannels") || "[]"); } catch { return []; }
    })(),
    config: (() => {
      try {
        const cfg = JSON.parse(get("config_json") || "{}");
        const analysisLang = get("postCallAnalysisLang");
        if (analysisLang) cfg.postCallAnalysisLang = analysisLang;
        return cfg;
      } catch { return {}; }
    })(),
    functions: (() => {
      try { return JSON.parse(get("functions_json") || "[]"); } catch { return []; }
    })(),
  };
}

function mapLanguageToRetell(lang: string): string {
  const map: Record<string, string> = {
    "fr-FR": "fr-FR",
    "en-US": "en-US",
    "en-GB": "en-GB",
    "es-ES": "es-ES",
    "de-DE": "de-DE",
    "ar-SA": "ar-SA",
    "tr-TR": "tr-TR",
    "pt-BR": "pt-BR",
    "it-IT": "it-IT",
    "nl-NL": "nl-NL",
    "pl-PL": "pl-PL",
    "ru-RU": "ru-RU",
    "ja-JP": "ja-JP",
    "zh-CN": "zh-CN",
    "ko-KR": "ko-KR",
    "multi": "multi",
  };
  return map[lang] || "fr-FR";
}

function mapLanguageToLabel(lang: string): string {
  const map: Record<string, string> = {
    "fr-FR": "français",
    "en-US": "English",
    "en-GB": "English",
    "es-ES": "español",
    "de-DE": "Deutsch",
    "ar-SA": "العربية",
    "tr-TR": "Türkçe",
    "pt-BR": "português",
    "it-IT": "italiano",
    "nl-NL": "Nederlands",
    "pl-PL": "polski",
    "ru-RU": "русский",
    "ja-JP": "日本語",
    "zh-CN": "中文",
    "ko-KR": "한국어",
    "multi": "the same language as the conversation",
  };
  return map[lang] || "français";
}

function formatPhoneE164(phone: string): string {
  return phone.startsWith("+") ? phone : `+33${phone.replace(/^0/, "")}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRetellTools(agent: any): Record<string, unknown>[] {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://callaps.ai").replace(/\/+$/, "");
  const baseToolUrl = `${appUrl}/api/agents/${agent.id}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const functions = (Array.isArray(agent.functions) ? agent.functions : []) as any[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return functions.map((fn: any) => {
    if (fn.type === "end_call") {
      return {
        type: "end_call",
        name: fn.name || "end_call",
        description: fn.description || "Termine l'appel.",
        speak_after_execution: fn.speakAfter ?? true,
      };
    }

    if (fn.type === "transfer_call") {
      const isWarm = fn.transferType !== "cold_transfer";
      return {
        type: "transfer_call",
        name: fn.name || "transfer_call",
        description: fn.description || "Transfère l'appel.",
        transfer_destination: {
          type: "predefined",
          number: formatPhoneE164(fn.transferPhone || ""),
        },
        transfer_option: {
          type: fn.transferType || "warm_transfer",
          ...(isWarm && fn.transferMessage ? {
            prompt: fn.transferMessage,
          } : {}),
          show_transferee_as_caller: false,
        },
        speak_during_execution: fn.speakDuring ?? true,
      };
    }

    if (fn.type === "check_availability_cal") {
      return {
        type: "custom",
        name: fn.name || "check_availability_cal",
        description: fn.description || "Vérifie les créneaux disponibles sur Cal.com.",
        url: `${baseToolUrl}/check-calendar`,
        method: "POST",
        speak_during_execution: fn.speakDuring ?? true,
        speak_after_execution: fn.speakAfter ?? true,
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "La date à vérifier au format YYYY-MM-DD",
            },
          },
          required: ["date"],
        },
      };
    }

    if (fn.type === "book_cal") {
      return {
        type: "custom",
        name: fn.name || "book_cal",
        description: fn.description || "Réserve un créneau sur Cal.com.",
        url: `${baseToolUrl}/book-calendar`,
        method: "POST",
        speak_during_execution: fn.speakDuring ?? true,
        speak_after_execution: fn.speakAfter ?? true,
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "La date du rendez-vous au format YYYY-MM-DD",
            },
            time: {
              type: "string",
              description: "L'heure du rendez-vous au format HH:MM",
            },
            name: {
              type: "string",
              description: "Le nom de la personne",
            },
            email: {
              type: "string",
              description: "L'adresse email de la personne",
            },
          },
          required: ["date", "time", "name"],
        },
      };
    }

    if (fn.type === "custom") {
      let params;
      try { params = fn.parameters ? JSON.parse(fn.parameters) : undefined; } catch { params = undefined; }
      return {
        type: "custom",
        name: fn.name,
        description: fn.description || "",
        url: fn.url || fn.apiUrl || `${baseToolUrl}/${fn.name}`,
        method: fn.method || fn.apiMethod || "POST",
        speak_during_execution: fn.speakDuring ?? false,
        speak_after_execution: fn.speakAfter ?? true,
        ...(params ? { parameters: params } : {}),
      };
    }

    // Fallback: pass as-is
    return { type: fn.type, name: fn.name, description: fn.description || "" };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRetellLlmParams(agent: any) {
  return {
    general_prompt: `[Date et heure actuelles : {{current_time_Europe/Paris}}]\n\n${agent.systemPrompt}`,
    begin_message: agent.firstMessage || undefined,
    model: agent.llmModel,
    start_speaker: agent.firstMessageMode === "user_first" ? "agent" as const : "agent" as const,
    general_tools: buildRetellTools(agent),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRetellAgentParams(agent: any, llmId: string) {
  const config = (typeof agent.config === "object" && agent.config !== null ? agent.config : {}) as Record<string, unknown>;

  return {
    agent_name: agent.name,
    voice_id: agent.voiceId || "minimax-Camille",
    language: mapLanguageToRetell(agent.language),
    response_engine: {
      type: "retell-llm" as const,
      llm_id: llmId,
    },
    voice_speed: agent.voiceSpeed,
    voice_temperature: agent.voiceTemperature,
    ...(config.responsiveness !== undefined ? { responsiveness: config.responsiveness as number } : {}),
    ...(config.interruptionSensitivity !== undefined ? { interruption_sensitivity: config.interruptionSensitivity as number } : {}),
    ...(config.enableBackchanneling !== undefined ? { enable_backchannel: config.enableBackchanneling as boolean } : {}),
    max_call_duration_ms: agent.maxCallDuration * 1000,
    ...(agent.endCallOnSilence ? { end_call_after_silence_ms: Math.max(agent.silenceTimeout, 10) * 1000 } : {}),
    webhook_url: agent.postCallWebhook || `${process.env.NEXT_PUBLIC_APP_URL || "https://callaps.ai"}/api/retell/webhook`,
    ...(agent.postCallAnalysis ? (() => {
      const analysisLang = mapLanguageToLabel(config.postCallAnalysisLang as string || agent.language);
      const langInstruction = `RESPOND ONLY IN ${analysisLang.toUpperCase()}.`;
      return {
        post_call_analysis_data: [
          {
            type: "string",
            name: "call_summary",
            description: `${langInstruction} Résumé concis de l'appel en 2-3 phrases. Inclure le motif, les points clés et le résultat.`,
          },
          {
            type: "enum",
            name: "user_sentiment",
            description: `${langInstruction} Sentiment général de l'interlocuteur.`,
            choices: ["Positif", "Neutre", "Négatif"],
          },
          {
            type: "boolean",
            name: "call_successful",
            description: "L'appel a-t-il atteint son objectif ?",
          },
          {
            type: "string",
            name: "caller_name",
            description: "Nom de l'appelant s'il a été mentionné.",
          },
          {
            type: "string",
            name: "caller_phone",
            description: "Numéro de téléphone de l'appelant s'il a été mentionné.",
          },
          {
            type: "string",
            name: "call_reason",
            description: `${langInstruction} Raison principale de l'appel.`,
          },
        ],
      };
    })() : {}),
  };
}

export async function createAgent(formData: FormData) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "agents:create")) {
    throw new Error("Permission denied");
  }

  const data = extractAgentData(formData);

  const agent = await prisma.agent.create({
    data: {
      name: data.name,
      description: data.description,
      systemPrompt: data.systemPrompt,
      firstMessage: data.firstMessage,
      firstMessageMode: data.firstMessageMode,
      llmModel: data.llmModel,
      voiceId: data.voiceId,
      voiceSpeed: data.voiceSpeed,
      voiceTemperature: data.voiceTemperature,
      language: data.language,
      maxCallDuration: data.maxCallDuration,
      silenceTimeout: data.silenceTimeout,
      endCallOnSilence: data.endCallOnSilence,
      enableRecording: data.enableRecording,
      postCallAnalysis: data.postCallAnalysis,
      postCallPrompt: data.postCallPrompt,
      postCallWebhook: data.postCallWebhook,
      safetyMessage: data.safetyMessage,
      maxSafetyRetries: data.maxSafetyRetries,
      userId: ctx.userId,
      orgId: ctx.orgId,
    },
  });

  revalidatePath("/agents");
  redirect(`/agents/${agent.id}`);
}

export async function updateAgent(id: string, formData: FormData) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "agents:update")) {
    throw new Error("Permission denied");
  }

  const data = extractAgentData(formData);

  const agent = await prisma.agent.update({
    where: { id, userId: ctx.userId, ...orgFilter(ctx) },
    data,
  });

  // Si déjà publié sur Retell, sync
  if (agent.retellAgentId && agent.retellLlmId) {
    await updateRetellLlm(agent.retellLlmId, buildRetellLlmParams(agent));
    await updateRetellAgent(agent.retellAgentId, buildRetellAgentParams(agent, agent.retellLlmId));
  }

  revalidatePath(`/agents/${id}`);
  revalidatePath("/agents");
}

export async function publishAgent(id: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "agents:publish")) {
    throw new Error("Permission denied");
  }

  const agent = await prisma.agent.findFirst({
    where: { id, userId: ctx.userId, ...orgFilter(ctx) },
  });
  if (!agent) throw new Error("Agent not found");

  let retellLlmId = agent.retellLlmId;
  let retellAgentId = agent.retellAgentId;

  if (!retellLlmId) {
    // Create LLM first
    const llm = await createRetellLlm(buildRetellLlmParams(agent));
    retellLlmId = llm.llm_id;
  } else {
    await updateRetellLlm(retellLlmId, buildRetellLlmParams(agent));
  }

  if (!retellAgentId) {
    // Create Agent linked to LLM
    const retellAgent = await createRetellAgent(buildRetellAgentParams(agent, retellLlmId!));
    retellAgentId = retellAgent.agent_id;
  } else {
    await updateRetellAgent(retellAgentId, buildRetellAgentParams(agent, retellLlmId!));
  }

  await prisma.agent.update({
    where: { id, userId: ctx.userId },
    data: { published: true, retellAgentId, retellLlmId },
  });

  revalidatePath(`/agents/${id}`);
  revalidatePath("/agents");
}

export async function deleteAgent(id: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "agents:delete")) {
    throw new Error("Permission denied");
  }

  const agent = await prisma.agent.findFirst({
    where: { id, userId: ctx.userId, ...orgFilter(ctx) },
  });
  if (!agent) throw new Error("Agent not found");

  // Supprimer sur Retell si publié
  if (agent.retellAgentId) {
    try {
      await deleteRetellAgent(agent.retellAgentId);
    } catch {
      // Ignore si déjà supprimé
    }
  }
  if (agent.retellLlmId) {
    try {
      await deleteRetellLlm(agent.retellLlmId);
    } catch {
      // Ignore si déjà supprimé
    }
  }

  await prisma.agent.delete({ where: { id } });

  revalidatePath("/agents");
  redirect("/agents");
}

export async function getWebCallToken(agentId: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "agents:read")) {
    throw new Error("Permission denied");
  }

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, userId: ctx.userId, ...orgFilter(ctx) },
  });
  if (!agent?.retellAgentId) throw new Error("Agent not published");

  const webCall = await createWebCall({ agent_id: agent.retellAgentId });
  return { access_token: webCall.access_token };
}
