const RETELL_BASE_URL = "https://api.retellai.com";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// --- LLM ---

export interface CreateLlmParams {
  general_prompt: string;
  begin_message?: string | null;
  model?: string;
  model_temperature?: number;
  start_speaker?: "user" | "agent";
  general_tools?: Array<Record<string, unknown>>;
}

export async function createRetellLlm(params: CreateLlmParams) {
  const res = await fetch(`${RETELL_BASE_URL}/create-retell-llm`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      model: params.model || "gpt-4.1",
      general_prompt: params.general_prompt,
      ...(params.begin_message ? { begin_message: params.begin_message } : {}),
      ...(params.model_temperature !== undefined
        ? { model_temperature: params.model_temperature }
        : {}),
      ...(params.start_speaker
        ? { start_speaker: params.start_speaker }
        : {}),
      ...(params.general_tools
        ? { general_tools: params.general_tools }
        : {}),
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Retell createLlm failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function updateRetellLlm(
  llmId: string,
  params: Partial<CreateLlmParams>
) {
  const body: Record<string, unknown> = {};
  if (params.general_prompt !== undefined)
    body.general_prompt = params.general_prompt;
  if (params.begin_message !== undefined)
    body.begin_message = params.begin_message;
  if (params.model !== undefined) body.model = params.model;
  if (params.model_temperature !== undefined)
    body.model_temperature = params.model_temperature;
  if (params.start_speaker !== undefined)
    body.start_speaker = params.start_speaker;
  if (params.general_tools !== undefined)
    body.general_tools = params.general_tools;

  const res = await fetch(`${RETELL_BASE_URL}/update-retell-llm/${llmId}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Retell updateLlm failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function deleteRetellLlm(llmId: string) {
  const res = await fetch(`${RETELL_BASE_URL}/delete-retell-llm/${llmId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Retell deleteLlm failed: ${res.status} ${error}`);
  }
}

// --- Agent ---

export interface CreateAgentParams {
  agent_name: string;
  voice_id: string;
  language?: string;
  response_engine: {
    type: "retell-llm";
    llm_id: string;
  };
  voice_speed?: number;
  voice_temperature?: number;
  responsiveness?: number;
  interruption_sensitivity?: number;
  enable_backchannel?: boolean;
  max_call_duration_ms?: number;
  end_call_after_silence_ms?: number;
  webhook_url?: string;
}

export async function createAgent(params: CreateAgentParams) {
  const res = await fetch(`${RETELL_BASE_URL}/create-agent`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Retell createAgent failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function updateAgent(
  agentId: string,
  params: Partial<CreateAgentParams>
) {
  const res = await fetch(`${RETELL_BASE_URL}/update-agent/${agentId}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Retell updateAgent failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function deleteAgent(agentId: string) {
  const res = await fetch(`${RETELL_BASE_URL}/delete-agent/${agentId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Retell deleteAgent failed: ${res.status} ${error}`);
  }
}

export async function getAgent(agentId: string) {
  const res = await fetch(`${RETELL_BASE_URL}/get-agent/${agentId}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Retell getAgent failed: ${res.status} ${error}`);
  }

  return res.json();
}

// --- Calls ---

export interface CreatePhoneCallParams {
  from_number: string;
  to_number: string;
  override_agent_id?: string;
  metadata?: Record<string, unknown>;
  retell_llm_dynamic_variables?: Record<string, string>;
}

export async function createPhoneCall(params: CreatePhoneCallParams) {
  const res = await fetch(`${RETELL_BASE_URL}/v2/create-phone-call`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Retell createPhoneCall failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function getCall(callId: string) {
  const res = await fetch(`${RETELL_BASE_URL}/v2/get-call/${callId}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Retell getCall failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function listCalls(filters?: {
  agent_id?: string[];
  call_status?: string[];
  sort_order?: "ascending" | "descending";
  limit?: number;
}) {
  const res = await fetch(`${RETELL_BASE_URL}/v2/list-calls`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      sort_order: "descending",
      limit: 100,
      ...filters,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Retell listCalls failed: ${res.status} ${error}`);
  }

  return res.json();
}

// --- Phone Numbers ---

export async function listPhoneNumbers() {
  const res = await fetch(`${RETELL_BASE_URL}/list-phone-numbers`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Retell listPhoneNumbers failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function getPhoneNumber(phoneNumber: string) {
  const res = await fetch(
    `${RETELL_BASE_URL}/get-phone-number/${encodeURIComponent(phoneNumber)}`,
    { headers: getHeaders() }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Retell getPhoneNumber failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function importPhoneNumber(params: {
  phone_number: string;
  termination_uri: string;
  inbound_agent_id?: string;
  outbound_agent_id?: string;
  nickname?: string;
  sip_trunk_auth_username?: string;
  sip_trunk_auth_password?: string;
}) {
  const res = await fetch(`${RETELL_BASE_URL}/import-phone-number`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Retell importPhoneNumber failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function updatePhoneNumber(
  phoneNumber: string,
  params: {
    inbound_agent_id?: string | null;
    outbound_agent_id?: string | null;
    nickname?: string;
  }
) {
  const res = await fetch(
    `${RETELL_BASE_URL}/update-phone-number/${encodeURIComponent(phoneNumber)}`,
    {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(params),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Retell updatePhoneNumber failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function deletePhoneNumber(phoneNumber: string) {
  const res = await fetch(
    `${RETELL_BASE_URL}/delete-phone-number/${encodeURIComponent(phoneNumber)}`,
    {
      method: "DELETE",
      headers: getHeaders(),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Retell deletePhoneNumber failed: ${res.status} ${error}`);
  }
}

// --- Voices ---

export interface RetellVoice {
  voice_id: string;
  voice_name: string;
  provider: string;
  gender: string;
  accent?: string;
  age?: string;
  preview_audio_url?: string;
}

export async function listVoices(): Promise<RetellVoice[]> {
  const res = await fetch(`${RETELL_BASE_URL}/list-voices`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Retell listVoices failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function createVoice(formData: FormData): Promise<{ voice_id: string }> {
  const res = await fetch(`${RETELL_BASE_URL}/clone-voice`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Retell createVoice failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function deleteVoice(voiceId: string): Promise<void> {
  const res = await fetch(`${RETELL_BASE_URL}/delete-voice/${voiceId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Retell deleteVoice failed: ${res.status} ${error}`);
  }
}

// --- Web Call ---

export async function createWebCall(params: {
  agent_id: string;
  metadata?: Record<string, unknown>;
  retell_llm_dynamic_variables?: Record<string, string>;
}) {
  const res = await fetch(`${RETELL_BASE_URL}/v2/create-web-call`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Retell createWebCall failed: ${res.status} ${error}`);
  }

  return res.json();
}
