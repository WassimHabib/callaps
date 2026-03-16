import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPhoneCall, listPhoneNumbers } from "@/lib/retell";

/**
 * Slack Slash Command endpoint.
 * Usage in Slack: /appel +33612345678 [NomAgent]
 *
 * Responds immediately to avoid Slack's 3s timeout,
 * then processes the call in the background via after().
 * Sends result back via Slack's response_url.
 */
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "slack-commands" });
}

export async function POST(req: NextRequest) {
  // Parse Slack form data
  const formData = await req.formData();
  const text = (formData.get("text") as string) || "";
  const responseUrl = (formData.get("response_url") as string) || "";
  const token = req.nextUrl.searchParams.get("token");

  // Quick validation — respond immediately if invalid
  if (!token) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "❌ Token manquant dans l'URL. Vérifiez la configuration du Slash Command.",
    });
  }

  const parts = text.trim().split(/\s+/);
  if (!parts[0]) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "📞 Usage : `/appel +33612345678 [NomAgent]`\nExemple : `/appel +33651370395 Shaima`",
    });
  }

  const toNumber = parts[0];
  const agentName = parts.slice(1).join(" ") || null;

  if (!/^\+\d{8,15}$/.test(toNumber)) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "❌ Numéro invalide. Format : `+33612345678`",
    });
  }

  // Respond immediately to Slack (avoid 3s timeout)
  after(async () => {
    await processSlackCall(token, toNumber, agentName, responseUrl);
  });

  return NextResponse.json({
    response_type: "ephemeral",
    text: `📞 Lancement de l'appel vers \`${toNumber}\`...`,
  });
}

/**
 * Heavy processing done after responding to Slack.
 * Sends result back via response_url.
 */
async function processSlackCall(
  token: string,
  toNumber: string,
  agentName: string | null,
  responseUrl: string
) {
  try {
    // Verify integration
    const integration = await prisma.integration.findUnique({
      where: { id: token },
    });

    if (!integration || integration.type !== "slack" || !integration.enabled) {
      await slackRespond(responseUrl, "❌ Intégration Slack non trouvée ou désactivée.");
      return;
    }

    const userId = integration.userId;

    // Find agent
    const agentWhere = {
      userId,
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
        await slackRespond(
          responseUrl,
          `❌ Agent "${agentName}" non trouvé.\nDisponibles : ${agents.map((a) => `*${a.name}*`).join(", ") || "aucun"}`
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
      await slackRespond(responseUrl, "❌ Aucun agent IA disponible.");
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
      await slackRespond(responseUrl, "❌ Aucun numéro de téléphone configuré.");
      return;
    }

    // Launch the call
    const result = await createPhoneCall({
      from_number: phone.phone_number,
      to_number: toNumber,
      override_agent_id: agent.retellAgentId!,
    });

    // Create call record with Slack response_url for post-call notification
    if (result.call_id) {
      await prisma.call.create({
        data: {
          retellCallId: result.call_id,
          status: "pending",
          userId,
          metadata: {
            source: "slack_command",
            slackResponseUrl: responseUrl,
            agentId: agent.id,
            agentName: agent.name,
          },
        },
      });
    }

    await slackRespond(
      responseUrl,
      `📞 Appel lancé !\n• Agent : *${agent.name}*\n• Vers : \`${toNumber}\`\n• Depuis : \`${phone.phone_number}\``,
      "in_channel"
    );
  } catch (error) {
    console.error("[slack-command] Error:", error);
    await slackRespond(
      responseUrl,
      `❌ Erreur : ${String(error).replace("Error: ", "")}`
    );
  }
}

/**
 * Send a message back to Slack via response_url.
 */
async function slackRespond(
  responseUrl: string,
  text: string,
  responseType: "ephemeral" | "in_channel" = "ephemeral"
) {
  if (!responseUrl) return;
  try {
    await fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response_type: responseType, text }),
    });
  } catch (err) {
    console.error("[slack-command] Failed to respond:", err);
  }
}
