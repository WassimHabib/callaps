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
    stability?: number;
  };
  firstMessage?: string;
  firstMessageMode?: string;
  transcriber?: {
    provider: string;
    language: string;
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
      provider: params.voice.provider,
      voiceId: params.voice.voiceId,
      ...(params.voice.speed && { speed: params.voice.speed }),
      ...(params.voice.stability && { stability: params.voice.stability }),
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
      provider: params.voice.provider,
      voiceId: params.voice.voiceId,
      ...(params.voice.speed && { speed: params.voice.speed }),
      ...(params.voice.stability && { stability: params.voice.stability }),
    };
  }

  if (params.firstMessage !== undefined) body.firstMessage = params.firstMessage;
  if (params.maxDurationSeconds) body.maxDurationSeconds = params.maxDurationSeconds;
  if (params.silenceTimeoutSeconds) body.silenceTimeoutSeconds = params.silenceTimeoutSeconds;
  if (params.recordingEnabled !== undefined) body.recordingEnabled = params.recordingEnabled;

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

// --- Helpers ---

function getModelProvider(model: string): string {
  if (model.startsWith("gpt") || model.startsWith("o1") || model.startsWith("o3")) return "openai";
  if (model.startsWith("claude")) return "anthropic";
  if (model.startsWith("gemini")) return "google";
  if (model.startsWith("llama") || model.startsWith("deepseek")) return "groq";
  return "openai";
}
