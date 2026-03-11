import type { CallActivityData, SyncResult } from "./types";

/**
 * Format a duration in seconds to "Xm Ys".
 */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

/**
 * Send a payload to a Slack Incoming Webhook.
 */
async function postToWebhook(
  webhookUrl: string,
  payload: Record<string, unknown>
): Promise<SyncResult> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        success: false,
        message: `Slack webhook échoué (${res.status}): ${body}`,
      };
    }

    return { success: true, message: "Notification Slack envoyée." };
  } catch (error) {
    return {
      success: false,
      message: `Erreur Slack: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Test the Slack webhook connection.
 */
export async function testConnection(webhookUrl: string): Promise<SyncResult> {
  return postToWebhook(webhookUrl, {
    text: "✅ Wevlap connecté avec succès !",
  });
}

/**
 * Send a call-ended notification to Slack.
 */
export async function sendCallNotification(
  webhookUrl: string,
  data: CallActivityData
): Promise<SyncResult> {
  const blocks: Record<string, unknown>[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📞 Appel terminé",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${data.contactName}*\n${data.contactPhone}`,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Durée:*\n${formatDuration(data.duration)}`,
        },
        {
          type: "mrkdwn",
          text: `*Résultat:*\n${data.outcome}`,
        },
        ...(data.sentiment
          ? [
              {
                type: "mrkdwn" as const,
                text: `*Sentiment:*\n${data.sentiment}`,
              },
            ]
          : []),
      ],
    },
  ];

  if (data.summary) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Résumé:*\n${data.summary}`,
      },
    });
  }

  if (data.recordingUrl) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<${data.recordingUrl}|🎧 Écouter l'enregistrement>`,
      },
    });
  }

  blocks.push({ type: "divider" });

  return postToWebhook(webhookUrl, {
    text: `📞 Appel terminé avec ${data.contactName}`,
    blocks,
  });
}

/**
 * Send a lead-detected notification to Slack.
 */
export async function sendLeadNotification(
  webhookUrl: string,
  data: {
    name: string;
    phone: string;
    score: number;
    reason: string;
    company?: string;
  }
): Promise<SyncResult> {
  const blocks: Record<string, unknown>[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🔥 Lead détecté",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${data.name}*\n${data.phone}${data.company ? `\n🏢 ${data.company}` : ""}`,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Score:*\n${data.score}/100`,
        },
        {
          type: "mrkdwn",
          text: `*Raison:*\n${data.reason}`,
        },
      ],
    },
    { type: "divider" },
  ];

  return postToWebhook(webhookUrl, {
    text: `🔥 Lead détecté: ${data.name} (score: ${data.score})`,
    blocks,
  });
}

/**
 * Send a campaign-completed notification to Slack.
 */
export async function sendCampaignNotification(
  webhookUrl: string,
  data: {
    name: string;
    totalCalls: number;
    completed: number;
    rate: number;
  }
): Promise<SyncResult> {
  const blocks: Record<string, unknown>[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📊 Campagne terminée",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${data.name}*`,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Total appels:*\n${data.totalCalls}`,
        },
        {
          type: "mrkdwn",
          text: `*Complétés:*\n${data.completed}`,
        },
        {
          type: "mrkdwn",
          text: `*Taux de succès:*\n${data.rate}%`,
        },
      ],
    },
    { type: "divider" },
  ];

  return postToWebhook(webhookUrl, {
    text: `📊 Campagne "${data.name}" terminée - ${data.completed}/${data.totalCalls} appels (${data.rate}%)`,
    blocks,
  });
}
