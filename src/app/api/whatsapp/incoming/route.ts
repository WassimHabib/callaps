import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPhoneCall, listPhoneNumbers } from "@/lib/retell";

/**
 * Twilio WhatsApp Incoming Webhook.
 * Receives messages sent to the Twilio WhatsApp number.
 *
 * Usage: Send "appel +33612345678 [NomAgent]" via WhatsApp.
 *
 * Configure in Twilio Console → WhatsApp Sandbox → "When a message comes in"
 * URL: https://app.callaps.ai/api/whatsapp/incoming
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const body = (formData.get("Body") as string) || "";
  const from = (formData.get("From") as string) || "";

  // Strip "whatsapp:" prefix
  const senderPhone = from.replace("whatsapp:", "").trim();

  // Parse command: "appel +33612345678 [NomAgent]"
  const match = body.trim().match(/^appel\s+(\+\d{8,15})(?:\s+(.+))?$/i);

  if (!match) {
    return twimlResponse(
      "📞 *Commandes disponibles :*\n\nPour lancer un appel :\n`appel +33612345678 NomAgent`\n\nExemple :\n`appel +33651370395 Shaima`"
    );
  }

  const toNumber = match[1];
  const agentName = match[2]?.trim() || null;

  // Process in background to respond fast
  after(async () => {
    await processWhatsAppCall(senderPhone, toNumber, agentName);
  });

  return twimlResponse(`📞 Lancement de l'appel vers ${toNumber}...`);
}

async function processWhatsAppCall(
  senderPhone: string,
  toNumber: string,
  agentName: string | null
) {
  try {
    // Find user by phone number
    const normalizedPhone = senderPhone.startsWith("+")
      ? senderPhone
      : `+${senderPhone}`;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: normalizedPhone },
          { phone: senderPhone },
          { phone: normalizedPhone.replace("+", "") },
        ],
      },
    });

    if (!user) {
      await sendWhatsApp(senderPhone, "❌ Numéro non reconnu. Assurez-vous que votre numéro WhatsApp est enregistré dans votre profil Callaps.");
      return;
    }

    // Find agent
    const agentWhere = {
      userId: user.id,
      archived: false,
      NOT: { retellAgentId: null },
    };

    let agent;
    if (agentName) {
      agent = await prisma.agent.findFirst({
        where: { ...agentWhere, name: { contains: agentName, mode: "insensitive" as const } },
      });
      if (!agent) {
        const agents = await prisma.agent.findMany({
          where: agentWhere,
          select: { name: true },
          orderBy: { name: "asc" },
        });
        await sendWhatsApp(
          senderPhone,
          `❌ Agent "${agentName}" non trouvé.\n\nAgents disponibles :\n${agents.map((a) => `• ${a.name}`).join("\n") || "aucun"}`
        );
        return;
      }
    } else {
      agent = await prisma.agent.findFirst({
        where: agentWhere,
        orderBy: { createdAt: "desc" },
      });
    }

    if (!agent || !agent.retellAgentId) {
      await sendWhatsApp(senderPhone, "❌ Aucun agent IA disponible.");
      return;
    }

    // Find from number
    const phoneNumbers = await listPhoneNumbers();
    const assigned = phoneNumbers.find(
      (p: { outbound_agent_id?: string }) =>
        p.outbound_agent_id === agent!.retellAgentId
    );
    const phone = assigned || phoneNumbers[0];
    if (!phone) {
      await sendWhatsApp(senderPhone, "❌ Aucun numéro de téléphone configuré.");
      return;
    }

    // Launch the call
    const result = await createPhoneCall({
      from_number: phone.phone_number,
      to_number: toNumber,
      override_agent_id: agent.retellAgentId!,
    });

    // Create call record with WhatsApp metadata for post-call notification
    if (result.call_id) {
      await prisma.call.create({
        data: {
          retellCallId: result.call_id,
          status: "pending",
          userId: user.id,
          metadata: {
            source: "whatsapp_command",
            whatsappSender: senderPhone,
            agentId: agent.id,
            agentName: agent.name,
          },
        },
      });
    }

    await sendWhatsApp(
      senderPhone,
      `📞 Appel lancé !\n• Agent : *${agent.name}*\n• Vers : ${toNumber}\n• Depuis : ${phone.phone_number}`
    );
  } catch (error) {
    console.error("[whatsapp-command] Error:", error);
    await sendWhatsApp(
      senderPhone,
      `❌ Erreur : ${String(error).replace("Error: ", "")}`
    );
  }
}

/**
 * Send a WhatsApp message via Twilio API.
 */
async function sendWhatsApp(to: string, body: string) {
  // Try env vars first, then check for any Twilio integration
  let accountSid = process.env.TWILIO_ACCOUNT_SID;
  let authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || "+14155238886";

  if (!accountSid || !authToken) {
    // Find any enabled Twilio integration
    const integration = await prisma.integration.findFirst({
      where: { type: "twilio", enabled: true },
    });
    if (integration) {
      const config = integration.config as { accountSid?: string; authToken?: string };
      accountSid = config.accountSid;
      authToken = config.authToken;
    }
  }

  if (!accountSid || !authToken) {
    console.error("[whatsapp-command] No Twilio credentials found");
    return;
  }

  const toNumber = to.startsWith("+") ? to : `+${to}`;
  const params = new URLSearchParams();
  params.set("From", `whatsapp:${whatsappFrom}`);
  params.set("To", `whatsapp:${toNumber}`);
  params.set("Body", body);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error("[whatsapp-command] Send failed:", res.status, errText);
  }
}

/**
 * Return a TwiML response (Twilio expects this format).
 */
function twimlResponse(message: string) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
