const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
}

function getAuthHeader(creds: TwilioCredentials): string {
  return `Basic ${Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString("base64")}`;
}

/**
 * Configure the voice webhook on a Twilio phone number
 * so incoming calls are forwarded to Retell's inbound endpoint.
 */
export async function setInboundWebhook(
  creds: TwilioCredentials,
  phoneNumberSid: string,
  retellAgentId: string | null
) {
  const params = new URLSearchParams();

  if (retellAgentId) {
    // Retell's Twilio server endpoint
    params.set(
      "VoiceUrl",
      `https://api.retellai.com/twilio-server/${retellAgentId}`
    );
    params.set("VoiceMethod", "POST");
    // Also set the status callback so Retell gets call events
    params.set(
      "StatusCallback",
      `https://api.retellai.com/twilio-server/${retellAgentId}`
    );
    params.set("StatusCallbackMethod", "POST");
  } else {
    params.set("VoiceUrl", "");
    params.set("VoiceMethod", "POST");
  }

  const res = await fetch(
    `${TWILIO_API_BASE}/Accounts/${creds.accountSid}/IncomingPhoneNumbers/${phoneNumberSid}.json`,
    {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(creds),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Twilio update failed: ${res.status} ${error}`);
  }

  return res.json();
}

/**
 * Find a Twilio phone number SID by its E.164 number (e.g. +33159580012)
 */
export async function findPhoneNumberSid(
  creds: TwilioCredentials,
  phoneNumber: string
): Promise<string | null> {
  const res = await fetch(
    `${TWILIO_API_BASE}/Accounts/${creds.accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(phoneNumber)}`,
    {
      headers: {
        Authorization: getAuthHeader(creds),
      },
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Twilio lookup failed: ${res.status} ${error}`);
  }

  const data = await res.json();
  return data.incoming_phone_numbers?.[0]?.sid ?? null;
}

/**
 * Get the current voice URL configured on a Twilio phone number.
 * Useful for diagnosing inbound call issues.
 */
export async function getPhoneNumberConfig(
  creds: TwilioCredentials,
  phoneNumber: string
): Promise<{
  sid: string | null;
  voiceUrl: string | null;
  voiceMethod: string | null;
  friendlyName: string | null;
} | null> {
  const res = await fetch(
    `${TWILIO_API_BASE}/Accounts/${creds.accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(phoneNumber)}`,
    {
      headers: {
        Authorization: getAuthHeader(creds),
      },
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const pn = data.incoming_phone_numbers?.[0];
  if (!pn) return null;

  return {
    sid: pn.sid,
    voiceUrl: pn.voice_url,
    voiceMethod: pn.voice_method,
    friendlyName: pn.friendly_name,
  };
}
