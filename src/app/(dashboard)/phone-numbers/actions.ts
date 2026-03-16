"use server";

import { getOrgContext, orgFilter } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  listPhoneNumbers as retellListPhoneNumbers,
  importPhoneNumber as retellImportPhoneNumber,
  updatePhoneNumber as retellUpdatePhoneNumber,
  deletePhoneNumber as retellDeletePhoneNumber,
  createPhoneCall,
} from "@/lib/retell";
import {
  findPhoneNumberSid,
  setInboundWebhook,
  getPhoneNumberConfig,
  type TwilioCredentials,
} from "@/lib/twilio";

/**
 * Get Twilio credentials for the current user.
 * Checks user's Integration first, then falls back to env vars.
 */
async function getTwilioCredentials(
  userId: string
): Promise<TwilioCredentials | null> {
  // Check user's stored Twilio integration
  const integration = await prisma.integration.findFirst({
    where: { userId, type: "twilio", enabled: true },
  });

  if (integration) {
    const config = integration.config as {
      accountSid?: string;
      authToken?: string;
    };
    if (config.accountSid && config.authToken) {
      return {
        accountSid: config.accountSid,
        authToken: config.authToken,
      };
    }
  }

  // Fallback to global env vars (platform-level Twilio)
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    return {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
    };
  }

  return null;
}

export async function fetchPhoneNumbers() {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "phone_numbers:read")) {
    throw new Error("Permission denied");
  }

  // Super admin sees all numbers
  if (ctx.isSuperAdmin) {
    const numbers = await retellListPhoneNumbers();
    return numbers;
  }

  // Get phone numbers owned by this org
  const orgId = ctx.orgId || ctx.userId;
  const ownedNumbers = await prisma.phoneNumber.findMany({
    where: { orgId },
    select: { phoneNumber: true },
  });
  const ownedSet = new Set(ownedNumbers.map((n) => n.phoneNumber));

  // Fetch all from Retell and filter to owned ones
  const allNumbers = await retellListPhoneNumbers();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return allNumbers.filter((n: any) => ownedSet.has(n.phone_number));
}

export async function importPhoneNumberAction(params: {
  phoneNumber: string;
  terminationUri: string;
  nickname?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
}) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "phone_numbers:manage")) {
    throw new Error("Permission denied");
  }

  // Store Twilio credentials if provided
  if (params.twilioAccountSid && params.twilioAuthToken) {
    await prisma.integration.upsert({
      where: {
        id: await prisma.integration
          .findFirst({
            where: { userId: ctx.userId, type: "twilio" },
            select: { id: true },
          })
          .then((i) => i?.id ?? "___new___"),
      },
      update: {
        config: {
          accountSid: params.twilioAccountSid,
          authToken: params.twilioAuthToken,
        },
        enabled: true,
      },
      create: {
        userId: ctx.userId,
        type: "twilio",
        name: "Twilio",
        config: {
          accountSid: params.twilioAccountSid,
          authToken: params.twilioAuthToken,
        },
        enabled: true,
      },
    });
  }

  const phoneNumber = await retellImportPhoneNumber({
    phone_number: params.phoneNumber,
    termination_uri: params.terminationUri,
    nickname: params.nickname || undefined,
    ...(params.twilioAccountSid && params.twilioAuthToken
      ? {
          sip_trunk_auth_username: params.twilioAccountSid,
          sip_trunk_auth_password: params.twilioAuthToken,
        }
      : {}),
  });

  // Register phone number ownership in DB
  const orgId = ctx.orgId || ctx.userId;
  await prisma.phoneNumber.upsert({
    where: { phoneNumber: params.phoneNumber },
    update: { orgId, userId: ctx.userId, nickname: params.nickname || null, provider: params.terminationUri ? "sip" : "twilio" },
    create: {
      phoneNumber: params.phoneNumber,
      orgId,
      userId: ctx.userId,
      nickname: params.nickname || null,
      provider: params.terminationUri ? "sip" : "twilio",
    },
  });

  revalidatePath("/phone-numbers");
  return phoneNumber;
}

export async function updatePhoneNumberAction(
  phoneNumber: string,
  params: {
    inbound_agent_id?: string | null;
    outbound_agent_id?: string | null;
    nickname?: string;
  }
) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "phone_numbers:manage")) {
    throw new Error("Permission denied");
  }

  // Update on Retell
  const result = await retellUpdatePhoneNumber(phoneNumber, params);

  // Auto-configure Twilio webhook when assigning/removing inbound agent
  if (params.inbound_agent_id !== undefined) {
    const creds = await getTwilioCredentials(ctx.userId);
    if (creds) {
      try {
        const phoneSid = await findPhoneNumberSid(creds, phoneNumber);
        if (phoneSid) {
          await setInboundWebhook(
            creds,
            phoneSid,
            params.inbound_agent_id ?? null
          );
        }
      } catch (err) {
        console.error("Failed to configure Twilio webhook:", err);
      }
    }
  }

  revalidatePath("/phone-numbers");
  return result;
}

export async function deletePhoneNumberAction(phoneNumber: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "phone_numbers:manage")) {
    throw new Error("Permission denied");
  }
  await retellDeletePhoneNumber(phoneNumber);

  // Remove ownership record
  await prisma.phoneNumber.deleteMany({
    where: { phoneNumber },
  });

  revalidatePath("/phone-numbers");
}

export async function fetchAgents() {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "agents:read")) {
    throw new Error("Permission denied");
  }
  return prisma.agent.findMany({
    where: { ...orgFilter(ctx), archived: false },
    select: { id: true, name: true, retellAgentId: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Check if current user has Twilio credentials stored.
 */
export async function hasTwilioCredentials(): Promise<boolean> {
  const ctx = await getOrgContext();
  const creds = await getTwilioCredentials(ctx.userId);
  return creds !== null;
}

/**
 * Save Twilio credentials for the current user.
 */
export async function saveTwilioCredentials(accountSid: string, authToken: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "phone_numbers:manage")) {
    throw new Error("Permission denied");
  }

  const existing = await prisma.integration.findFirst({
    where: { userId: ctx.userId, type: "twilio" },
    select: { id: true },
  });

  if (existing) {
    await prisma.integration.update({
      where: { id: existing.id },
      data: {
        config: { accountSid, authToken },
        enabled: true,
      },
    });
  } else {
    await prisma.integration.create({
      data: {
        userId: ctx.userId,
        type: "twilio",
        name: "Twilio",
        config: { accountSid, authToken },
        enabled: true,
      },
    });
  }

  revalidatePath("/phone-numbers");
}

/**
 * Configure Twilio webhook for inbound calls on a specific phone number.
 * Uses the stored Retell inbound_agent_id.
 */
export async function configureTwilioWebhook(
  phoneNumber: string,
  retellAgentId: string
): Promise<{ success: boolean; message: string }> {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "phone_numbers:manage")) {
    throw new Error("Permission denied");
  }

  const creds = await getTwilioCredentials(ctx.userId);
  if (!creds) {
    return {
      success: false,
      message: "Aucun compte Twilio configuré. Ajoutez vos identifiants Twilio d'abord.",
    };
  }

  try {
    const phoneSid = await findPhoneNumberSid(creds, phoneNumber);
    if (!phoneSid) {
      return {
        success: false,
        message: "Numéro non trouvé sur votre compte Twilio. Vérifiez que ce numéro appartient bien à votre compte.",
      };
    }

    await setInboundWebhook(creds, phoneSid, retellAgentId);
    return {
      success: true,
      message: "Webhook Twilio configuré ! Les appels entrants seront gérés par votre agent IA.",
    };
  } catch (err) {
    return {
      success: false,
      message: `Erreur Twilio : ${String(err).replace("Error: ", "")}`,
    };
  }
}

/**
 * Diagnostic: check what's currently configured on Twilio for this phone number.
 */
export async function diagnoseTwilioConfig(
  phoneNumber: string
): Promise<{
  hasCreds: boolean;
  found: boolean;
  voiceUrl: string | null;
  isCorrect: boolean;
  expectedUrl: string | null;
  message: string;
}> {
  const ctx = await getOrgContext();
  const creds = await getTwilioCredentials(ctx.userId);

  if (!creds) {
    return {
      hasCreds: false,
      found: false,
      voiceUrl: null,
      isCorrect: false,
      expectedUrl: null,
      message: "Aucun identifiant Twilio configuré.",
    };
  }

  const config = await getPhoneNumberConfig(creds, phoneNumber);
  if (!config) {
    return {
      hasCreds: true,
      found: false,
      voiceUrl: null,
      isCorrect: false,
      expectedUrl: null,
      message: "Numéro non trouvé sur votre compte Twilio.",
    };
  }

  const voiceUrl = config.voiceUrl || "";
  const isRetellUrl = voiceUrl.includes("retellai.com");

  return {
    hasCreds: true,
    found: true,
    voiceUrl: voiceUrl || "(vide)",
    isCorrect: isRetellUrl,
    expectedUrl: "https://api.retellai.com/twilio-server/{agent_id}",
    message: isRetellUrl
      ? `Webhook correctement configuré : ${voiceUrl}`
      : voiceUrl
        ? `Webhook mal configuré. Actuel : ${voiceUrl}`
        : "Aucun webhook configuré. Cliquez sur 'Activer les appels entrants'.",
  };
}

/**
 * Update SIP trunk credentials on Retell for outbound calls.
 */
export async function updatePhoneSipCredentials(
  phoneNumber: string
): Promise<{ success: boolean; message: string }> {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "phone_numbers:manage")) {
    throw new Error("Permission denied");
  }

  const creds = await getTwilioCredentials(ctx.userId);
  if (!creds) {
    return {
      success: false,
      message: "Aucun identifiant Twilio configuré.",
    };
  }

  try {
    const res = await fetch(
      `https://api.retellai.com/update-phone-number/${encodeURIComponent(phoneNumber)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sip_trunk_auth_username: creds.accountSid,
          sip_trunk_auth_password: creds.authToken,
        }),
      }
    );

    if (!res.ok) {
      const error = await res.text();
      return {
        success: false,
        message: `Erreur Retell: ${error}`,
      };
    }

    return {
      success: true,
      message: "Identifiants SIP configurés ! Les appels sortants sont maintenant activés.",
    };
  } catch (err) {
    return {
      success: false,
      message: `Erreur: ${String(err).replace("Error: ", "")}`,
    };
  }
}

export async function makeOutboundCall(params: {
  fromNumber: string;
  agentId: string;
  toNumber: string;
}) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "phone_numbers:manage")) {
    throw new Error("Permission denied");
  }

  const result = await createPhoneCall({
    from_number: params.fromNumber,
    to_number: params.toNumber,
    override_agent_id: params.agentId,
  });

  // Create a Call record so the Retell webhook can update it with transcript, duration, etc.
  if (result.call_id) {
    await prisma.call.create({
      data: {
        retellCallId: result.call_id,
        status: "pending",
        userId: ctx.userId,
        orgId: ctx.orgId,
      },
    });
  }

  return result;
}

/**
 * Admin: reassign a phone number to a different organization.
 */
export async function reassignPhoneNumber(
  phoneNumber: string,
  newOrgId: string
): Promise<{ success: boolean; message: string }> {
  const ctx = await getOrgContext();
  if (!ctx.isSuperAdmin) {
    throw new Error("Permission denied — super_admin only");
  }

  const existing = await prisma.phoneNumber.findUnique({
    where: { phoneNumber },
  });

  if (!existing) {
    await prisma.phoneNumber.create({
      data: {
        phoneNumber,
        orgId: newOrgId,
        userId: ctx.userId,
      },
    });
  } else {
    await prisma.phoneNumber.update({
      where: { phoneNumber },
      data: { orgId: newOrgId },
    });
  }

  revalidatePath("/phone-numbers");
  revalidatePath("/admin");
  return { success: true, message: "Numéro réassigné avec succès." };
}

/**
 * Admin: list all phone numbers with their org assignment.
 */
export async function fetchAllPhoneNumbersAdmin() {
  const ctx = await getOrgContext();
  if (!ctx.isSuperAdmin) {
    throw new Error("Permission denied — super_admin only");
  }

  const [retellNumbers, dbNumbers] = await Promise.all([
    retellListPhoneNumbers(),
    prisma.phoneNumber.findMany({
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const dbMap = new Map(dbNumbers.map((n) => [n.phoneNumber, n]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return retellNumbers.map((rn: any) => ({
    ...rn,
    _db: dbMap.get(rn.phone_number) || null,
  }));
}
