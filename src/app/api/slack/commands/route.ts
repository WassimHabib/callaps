import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPhoneCall, listPhoneNumbers } from "@/lib/retell";

/**
 * Slack Slash Command endpoint.
 * Usage in Slack: /appel +33612345678 [NomAgent]
 *
 * The Request URL configured in Slack must include ?token=<integrationId>
 * Example: https://app.callaps.ai/api/slack/commands?token=clxyz123...
 */
export async function POST(req: NextRequest) {
  // Parse Slack form data
  const formData = await req.formData();
  const text = (formData.get("text") as string) || "";
  const token = req.nextUrl.searchParams.get("token");

  // Auth via integration ID in query param
  if (!token) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "❌ Token manquant dans l'URL. Vérifiez la configuration du Slash Command.",
    });
  }

  const integration = await prisma.integration.findUnique({
    where: { id: token },
    include: { user: { select: { id: true, orgId: true } } },
  });

  if (!integration || integration.type !== "slack" || !integration.enabled) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "❌ Intégration Slack non trouvée ou désactivée.",
    });
  }

  const userId = integration.userId;
  const orgId = integration.user.orgId;

  // Parse command: /appel +33612345678 [AgentName]
  const parts = text.trim().split(/\s+/);
  if (!parts[0]) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: [
        "📞 *Lancer un appel depuis Slack*",
        "",
        "Usage : `/appel +33612345678 [NomAgent]`",
        "",
        "Exemples :",
        "• `/appel +33651370395` — appelle avec l'agent par défaut",
        "• `/appel +33651370395 Shaima` — appelle avec l'agent Shaima",
      ].join("\n"),
    });
  }

  const toNumber = parts[0];
  const agentName = parts.slice(1).join(" ") || null;

  // Validate phone number
  if (!/^\+\d{8,15}$/.test(toNumber)) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "❌ Numéro invalide. Utilise le format international : `+33612345678`",
    });
  }

  // Find agent
  const agentWhere = {
    ...(orgId ? { orgId } : { userId }),
    archived: false,
    retellAgentId: { not: null as string | null },
  };

  let agent;
  if (agentName) {
    agent = await prisma.agent.findFirst({
      where: { ...agentWhere, name: { contains: agentName, mode: "insensitive" as const } },
    });
    if (!agent) {
      // List available agents for help
      const agents = await prisma.agent.findMany({
        where: agentWhere,
        select: { name: true },
        orderBy: { name: "asc" },
      });
      return NextResponse.json({
        response_type: "ephemeral",
        text: `❌ Agent "${agentName}" non trouvé.\n\nAgents disponibles : ${agents.map((a) => `*${a.name}*`).join(", ") || "aucun"}`,
      });
    }
  } else {
    agent = await prisma.agent.findFirst({
      where: agentWhere,
      orderBy: { createdAt: "desc" },
    });
  }

  if (!agent || !agent.retellAgentId) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "❌ Aucun agent IA disponible. Créez un agent dans Callaps d'abord.",
    });
  }

  // Find a from number (prefer one assigned to this agent)
  let fromNumber: string;
  try {
    const phoneNumbers = await listPhoneNumbers();
    const assigned = phoneNumbers.find(
      (p: { outbound_agent_id?: string }) =>
        p.outbound_agent_id === agent!.retellAgentId
    );
    const phone = assigned || phoneNumbers[0];
    if (!phone) {
      return NextResponse.json({
        response_type: "ephemeral",
        text: "❌ Aucun numéro de téléphone configuré. Ajoutez un numéro dans Callaps.",
      });
    }
    fromNumber = phone.phone_number;
  } catch {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "❌ Impossible de récupérer les numéros de téléphone.",
    });
  }

  // Make the call
  try {
    const result = await createPhoneCall({
      from_number: fromNumber,
      to_number: toNumber,
      override_agent_id: agent.retellAgentId!,
    });

    // Create call record for tracking
    if (result.call_id) {
      await prisma.call.create({
        data: {
          retellCallId: result.call_id,
          status: "pending",
          userId,
          orgId,
        },
      });
    }

    return NextResponse.json({
      response_type: "in_channel",
      text: `📞 Appel lancé !\n• Agent : *${agent.name}*\n• Vers : \`${toNumber}\`\n• Depuis : \`${fromNumber}\``,
    });
  } catch (error) {
    console.error("[slack-command] Call failed:", error);
    return NextResponse.json({
      response_type: "ephemeral",
      text: `❌ Erreur lors du lancement de l'appel : ${String(error).replace("Error: ", "")}`,
    });
  }
}
