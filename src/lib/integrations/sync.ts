import { prisma } from "@/lib/prisma";
import type {
  IntegrationConfig,
  IntegrationProvider,
  ContactData,
  CallActivityData,
  SyncResult,
} from "./types";
import * as hubspot from "./hubspot";
import * as pipedrive from "./pipedrive";
import * as slack from "./slack";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface IntegrationRecord {
  id: string;
  type: string;
  config: unknown;
}

/**
 * Retrieve all enabled integrations of a given type for a user.
 */
async function getIntegrations(
  userId: string,
  type?: IntegrationProvider
): Promise<IntegrationRecord[]> {
  const where: Record<string, unknown> = { userId, enabled: true };
  if (type) {
    where.type = type;
  }
  return prisma.integration.findMany({ where }) as Promise<IntegrationRecord[]>;
}

/**
 * Safely parse the JSON config stored on an integration record.
 */
function parseConfig<T extends IntegrationProvider>(
  record: IntegrationRecord
): IntegrationConfig[T] {
  if (typeof record.config === "string") {
    return JSON.parse(record.config) as IntegrationConfig[T];
  }
  return record.config as IntegrationConfig[T];
}

// ---------------------------------------------------------------------------
// Sync: Contacts -> CRMs
// ---------------------------------------------------------------------------

/**
 * Push a contact to all enabled CRM integrations (HubSpot, Pipedrive) for a user.
 */
export async function syncContactToCRMs(
  userId: string,
  contact: ContactData
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  // HubSpot
  const hubspotIntegrations = await getIntegrations(userId, "hubspot");
  for (const integration of hubspotIntegrations) {
    try {
      const config = parseConfig<"hubspot">(integration);
      const result = await hubspot.pushContact(config.accessToken, contact);
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        message: `HubSpot sync échoué: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  // Pipedrive
  const pipedriveIntegrations = await getIntegrations(userId, "pipedrive");
  for (const integration of pipedriveIntegrations) {
    try {
      const config = parseConfig<"pipedrive">(integration);
      const result = await pipedrive.pushContact(
        config.apiToken,
        config.domain,
        contact
      );
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        message: `Pipedrive sync échoué: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Sync: Call Activity -> CRMs + Slack
// ---------------------------------------------------------------------------

/**
 * Push call activity data to all enabled integrations:
 * - CRMs (HubSpot, Pipedrive): create call engagement / activity
 * - Slack: send a call notification
 */
export async function pushCallToIntegrations(
  userId: string,
  callData: CallActivityData
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  // HubSpot
  const hubspotIntegrations = await getIntegrations(userId, "hubspot");
  for (const integration of hubspotIntegrations) {
    try {
      const config = parseConfig<"hubspot">(integration);
      const result = await hubspot.pushCallActivity(
        config.accessToken,
        callData
      );
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        message: `HubSpot call sync échoué: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  // Pipedrive
  const pipedriveIntegrations = await getIntegrations(userId, "pipedrive");
  for (const integration of pipedriveIntegrations) {
    try {
      const config = parseConfig<"pipedrive">(integration);
      const result = await pipedrive.pushCallActivity(
        config.apiToken,
        config.domain,
        callData
      );
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        message: `Pipedrive call sync échoué: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  // Slack
  const slackIntegrations = await getIntegrations(userId, "slack");
  for (const integration of slackIntegrations) {
    try {
      const config = parseConfig<"slack">(integration);
      const result = await slack.sendCallNotification(
        config.webhookUrl,
        callData
      );
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        message: `Slack notification échouée: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Slack notifications
// ---------------------------------------------------------------------------

/**
 * Send a Slack notification for a specific event type.
 */
export async function notifySlack(
  userId: string,
  event: "call_ended" | "lead_detected" | "campaign_completed",
  data: unknown
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  const slackIntegrations = await getIntegrations(userId, "slack");
  if (slackIntegrations.length === 0) {
    return [
      {
        success: false,
        message: "Aucune intégration Slack activée pour cet utilisateur.",
      },
    ];
  }

  for (const integration of slackIntegrations) {
    try {
      const config = parseConfig<"slack">(integration);
      let result: SyncResult;

      switch (event) {
        case "call_ended":
          result = await slack.sendCallNotification(
            config.webhookUrl,
            data as CallActivityData
          );
          break;

        case "lead_detected":
          result = await slack.sendLeadNotification(
            config.webhookUrl,
            data as {
              name: string;
              phone: string;
              score: number;
              reason: string;
              company?: string;
            }
          );
          break;

        case "campaign_completed":
          result = await slack.sendCampaignNotification(
            config.webhookUrl,
            data as {
              name: string;
              totalCalls: number;
              completed: number;
              rate: number;
            }
          );
          break;

        default:
          result = {
            success: false,
            message: `Type d'événement Slack inconnu: ${event}`,
          };
      }

      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        message: `Slack notification échouée: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return results;
}
