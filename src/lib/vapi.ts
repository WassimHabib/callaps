const VAPI_BASE_URL = "https://api.vapi.ai";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// --- Assistants ---

export interface CreateAssistantParams {
  name: string;
  model: {
    provider: string;
    model: string;
    systemMessage: string;
  };
  voice: {
    provider: string;
    voiceId: string;
    speed?: number;
  };
  firstMessage?: string;
  firstMessageMode?: string;
  transcriber?: {
    provider: string;
    language: string;
    model?: string;
  };
  maxDurationSeconds?: number;
  silenceTimeoutSeconds?: number;
  endCallOnSilence?: boolean;
  recordingEnabled?: boolean;
  analysisPlan?: {
    summaryPrompt?: string;
    structuredDataPrompt?: string;
  };
  serverUrl?: string;
  // Advanced settings
  backgroundSound?: string;
  responsiveness?: number;
  interruptSensitivity?: number;
  backchannelingEnabled?: boolean;
  backgroundDenoisingEnabled?: boolean;
  modelOutputInMessagesEnabled?: boolean;
  voicemailDetection?: {
    enabled: boolean;
  };
  startSpeakingPlan?: {
    waitSeconds?: number;
  };
  endCallPlan?: {
    silenceDurationSeconds?: number;
  };
}

export async function createAssistant(params: CreateAssistantParams) {
  const body: Record<string, unknown> = {
    name: params.name,
    model: {
      provider: getModelProvider(params.model.model),
      model: params.model.model,
      messages: [
        {
          role: "system",
          content: params.model.systemMessage,
        },
      ],
    },
    voice: {
      provider: mapVoiceProvider(params.voice.provider),
      voiceId: params.voice.voiceId,
    },
    transcriber: params.transcriber ?? {
      provider: "deepgram",
      language: "fr",
    },
    ...(params.firstMessage && { firstMessage: params.firstMessage }),
    ...(params.firstMessageMode && { firstMessageMode: params.firstMessageMode === "dynamic" ? "assistant-speaks-first" : params.firstMessageMode === "user_first" ? "assistant-waits-for-user" : "assistant-speaks-first-with-model-generated-message" }),
    ...(params.maxDurationSeconds && { maxDurationSeconds: params.maxDurationSeconds }),
    ...(params.silenceTimeoutSeconds && { silenceTimeoutSeconds: params.silenceTimeoutSeconds }),
    ...(params.recordingEnabled !== undefined && { recordingEnabled: params.recordingEnabled }),
    ...(params.serverUrl && { serverUrl: params.serverUrl }),
    // Advanced Vapi settings
    ...(params.backgroundSound && params.backgroundSound !== "none" && { backgroundSound: params.backgroundSound }),
    ...(params.backchannelingEnabled !== undefined && { backchannelingEnabled: params.backchannelingEnabled }),
    ...(params.backgroundDenoisingEnabled !== undefined && { backgroundDenoisingEnabled: params.backgroundDenoisingEnabled }),
    ...(params.voicemailDetection && { voicemailDetection: params.voicemailDetection }),
    ...(params.startSpeakingPlan && { startSpeakingPlan: params.startSpeakingPlan }),
    ...(params.endCallPlan && { endCallPlan: params.endCallPlan }),
  };

  if (params.analysisPlan?.summaryPrompt) {
    body.analysisPlan = {
      summaryPlan: {
        messages: [{ role: "system", content: params.analysisPlan.summaryPrompt }],
      },
    };
  }

  const res = await fetch(`${VAPI_BASE_URL}/assistant`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Vapi createAssistant failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function updateAssistant(assistantId: string, params: Partial<CreateAssistantParams>) {
  const body: Record<string, unknown> = {};

  if (params.name) body.name = params.name;

  if (params.model) {
    body.model = {
      provider: getModelProvider(params.model.model),
      model: params.model.model,
      messages: [{ role: "system", content: params.model.systemMessage }],
    };
  }

  if (params.voice) {
    body.voice = {
      provider: mapVoiceProvider(params.voice.provider),
      voiceId: params.voice.voiceId,
    };
  }

  if (params.firstMessage !== undefined) body.firstMessage = params.firstMessage;
  if (params.maxDurationSeconds) body.maxDurationSeconds = params.maxDurationSeconds;
  if (params.silenceTimeoutSeconds) body.silenceTimeoutSeconds = params.silenceTimeoutSeconds;
  if (params.recordingEnabled !== undefined) body.recordingEnabled = params.recordingEnabled;

  // Advanced settings
  if (params.backgroundSound !== undefined) body.backgroundSound = params.backgroundSound === "none" ? null : params.backgroundSound;
  if (params.backchannelingEnabled !== undefined) body.backchannelingEnabled = params.backchannelingEnabled;
  if (params.backgroundDenoisingEnabled !== undefined) body.backgroundDenoisingEnabled = params.backgroundDenoisingEnabled;
  if (params.voicemailDetection) body.voicemailDetection = params.voicemailDetection;
  if (params.startSpeakingPlan) body.startSpeakingPlan = params.startSpeakingPlan;
  if (params.endCallPlan) body.endCallPlan = params.endCallPlan;
  if (params.transcriber) body.transcriber = params.transcriber;

  const res = await fetch(`${VAPI_BASE_URL}/assistant/${assistantId}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Vapi updateAssistant failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function deleteAssistant(assistantId: string) {
  const res = await fetch(`${VAPI_BASE_URL}/assistant/${assistantId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Vapi deleteAssistant failed: ${res.status} ${error}`);
  }
}

// --- Calls ---

export interface CreateCallParams {
  assistantId: string;
  phoneNumberId?: string;
  customer: {
    number: string;
    name?: string;
  };
}

export async function createCall(params: CreateCallParams) {
  const body: Record<string, unknown> = {
    assistantId: params.assistantId,
    customer: params.customer,
  };

  if (params.phoneNumberId) {
    body.phoneNumberId = params.phoneNumberId;
  }

  const res = await fetch(`${VAPI_BASE_URL}/call`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Vapi createCall failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function getCall(callId: string) {
  const res = await fetch(`${VAPI_BASE_URL}/call/${callId}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Vapi getCall failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function listCalls(assistantId?: string, limit = 100) {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (assistantId) params.set("assistantId", assistantId);

  const res = await fetch(`${VAPI_BASE_URL}/call?${params}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Vapi listCalls failed: ${res.status} ${error}`);
  }

  return res.json();
}

// --- Phone Numbers ---

export async function listPhoneNumbers() {
  const res = await fetch(`${VAPI_BASE_URL}/phone-number`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Vapi listPhoneNumbers failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function getPhoneNumber(id: string) {
  const res = await fetch(`${VAPI_BASE_URL}/phone-number/${id}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Vapi getPhoneNumber failed: ${res.status} ${error}`);
  }

  return res.json();
}

export interface ImportPhoneNumberParams {
  number: string;
  name?: string;
  credentialId: string;
  assistantId?: string;
}

export async function importPhoneNumber(params: ImportPhoneNumberParams) {
  const res = await fetch(`${VAPI_BASE_URL}/phone-number`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      provider: "byo-phone-number",
      number: params.number,
      credentialId: params.credentialId,
      numberE164CheckEnabled: true,
      ...(params.name && { name: params.name }),
      ...(params.assistantId && { assistantId: params.assistantId }),
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Vapi importPhoneNumber failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function importTwilioPhoneNumber(params: {
  number: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  name?: string;
  assistantId?: string;
}) {
  const res = await fetch(`${VAPI_BASE_URL}/phone-number`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      provider: "twilio",
      number: params.number,
      twilioAccountSid: params.twilioAccountSid,
      twilioAuthToken: params.twilioAuthToken,
      ...(params.name && { name: params.name }),
      ...(params.assistantId && { assistantId: params.assistantId }),
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Vapi importTwilioPhoneNumber failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function updatePhoneNumber(id: string, params: { assistantId?: string | null; name?: string }) {
  const res = await fetch(`${VAPI_BASE_URL}/phone-number/${id}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Vapi updatePhoneNumber failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function deletePhoneNumber(id: string) {
  const res = await fetch(`${VAPI_BASE_URL}/phone-number/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Vapi deletePhoneNumber failed: ${res.status} ${error}`);
  }
}

// --- SIP Credentials ---

export async function createByoCredential(params: {
  sipTrunkUri: string;
  sipTrunkUsername?: string;
  sipTrunkPassword?: string;
}) {
  const body: Record<string, unknown> = {
    provider: "byo-sip-trunk",
    name: `SIP Trunk - ${params.sipTrunkUri}`,
    sipTrunkUri: params.sipTrunkUri,
  };
  if (params.sipTrunkUsername) {
    body.sipTrunkAuthentication = {
      username: params.sipTrunkUsername,
      password: params.sipTrunkPassword || "",
    };
  }

  const res = await fetch(`${VAPI_BASE_URL}/credential`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Vapi createByoCredential failed: ${res.status} ${error}`);
  }

  return res.json();
}

// --- Helpers ---

function mapVoiceProvider(provider: string): string {
  const map: Record<string, string> = {
    elevenlabs: "11labs",
  };
  return map[provider] || provider;
}

function getModelProvider(model: string): string {
  if (model.startsWith("gpt") || model.startsWith("o1") || model.startsWith("o3") || model.startsWith("o4")) return "openai";
  if (model.startsWith("claude")) return "anthropic";
  if (model.startsWith("gemini")) return "google";
  if (model.startsWith("groq-") || model.startsWith("llama")) return "groq";
  if (model.startsWith("deepseek")) return "deepinfra";
  return "openai";
}
