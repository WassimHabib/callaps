import { prisma } from "@/lib/prisma";
import { createPhoneCall } from "@/lib/retell";

interface CampaignWithAgent {
  id: string;
  status: string;
  scheduledAt: Date | null;
  startedAt: Date | null;
  callDays: unknown;
  callStartTime: string;
  callEndTime: string;
  timezoneMode: string;
  timezone: string;
  maxRetries: number;
  retryIntervalH: number;
  callRateCount: number;
  callRateMinutes: number;
  phoneNumberIds: unknown;
  agentId: string;
  agent: { retellAgentId: string | null };
}

/**
 * Check whether a campaign should be running right now
 * based on its callDays and callStartTime/callEndTime window.
 */
export function shouldCampaignRun(campaign: CampaignWithAgent): boolean {
  const tz = campaign.timezone || "Europe/Paris";
  const now = new Date();

  // Get current time in the campaign's timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
  });

  const timeParts = formatter.formatToParts(now);
  const hour = parseInt(timeParts.find((p) => p.type === "hour")?.value || "0");
  const minute = parseInt(timeParts.find((p) => p.type === "minute")?.value || "0");
  const currentMinutes = hour * 60 + minute;

  // Check day of week
  const dayStr = dayFormatter.format(now);
  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const currentDay = dayMap[dayStr] ?? 0;
  const allowedDays = (campaign.callDays as number[]) || [1, 2, 3, 4, 5];

  if (!allowedDays.includes(currentDay)) {
    return false;
  }

  // Check time window
  const [startH, startM] = campaign.callStartTime.split(":").map(Number);
  const [endH, endM] = campaign.callEndTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
    return false;
  }

  return true;
}

/**
 * Get the next batch of contacts that need calling for a campaign.
 * Excludes contacts that:
 * - Already have a successful (completed) call
 * - Have a call currently in_progress or pending
 * - Have exhausted all retries
 * - Were retried too recently (within retryIntervalH)
 */
export async function getNextBatchContacts(
  campaignId: string,
  batchSize: number
) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { maxRetries: true, retryIntervalH: true },
  });

  if (!campaign) return [];

  const retryThreshold = new Date(
    Date.now() - campaign.retryIntervalH * 60 * 60 * 1000
  );

  // Get all contacts for this campaign
  const contacts = await prisma.contact.findMany({
    where: {
      campaignId,
    },
    include: {
      calls: {
        where: { campaignId },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const eligible = contacts.filter((contact) => {
    const calls = contact.calls;

    // Never called — eligible
    if (calls.length === 0) return true;

    // Has a successful call — skip
    if (calls.some((c) => c.status === "completed")) return false;

    // Has a call currently in progress or pending — skip
    if (calls.some((c) => c.status === "pending" || c.status === "in_progress")) {
      return false;
    }

    // Count failed/no_answer attempts
    const failedAttempts = calls.filter(
      (c) => c.status === "failed" || c.status === "no_answer"
    ).length;

    // Exhausted retries (maxRetries = additional attempts, so total = 1 + maxRetries)
    if (failedAttempts > campaign.maxRetries) return false;

    // Check if enough time has passed since last attempt
    const lastCall = calls[0]; // Already ordered desc
    if (lastCall && lastCall.createdAt > retryThreshold) {
      return false;
    }

    return true;
  });

  return eligible.slice(0, batchSize);
}

/**
 * Process a batch of calls for a campaign.
 * This is the main engine function called periodically.
 */
export async function processCampaignBatch(campaignId: string): Promise<{
  campaignId: string;
  callsLaunched: number;
  errors: number;
  completed: boolean;
}> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      agent: { select: { retellAgentId: true } },
    },
  });

  if (!campaign) {
    return { campaignId, callsLaunched: 0, errors: 0, completed: false };
  }

  // If campaign is scheduled and scheduledAt has passed, start it
  if (
    campaign.status === "scheduled" &&
    campaign.scheduledAt &&
    campaign.scheduledAt <= new Date()
  ) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "running", startedAt: campaign.startedAt || new Date() },
    });
  }

  // Check if we should run now (time window + day)
  if (!shouldCampaignRun(campaign as CampaignWithAgent)) {
    return { campaignId, callsLaunched: 0, errors: 0, completed: false };
  }

  if (!campaign.agent.retellAgentId) {
    return { campaignId, callsLaunched: 0, errors: 0, completed: false };
  }

  const phoneNumberIds = (campaign.phoneNumberIds as string[]) || [];
  if (phoneNumberIds.length === 0) {
    return { campaignId, callsLaunched: 0, errors: 0, completed: false };
  }

  // Check how many calls are currently active (pending/in_progress) within the rate window
  const rateWindowStart = new Date(
    Date.now() - campaign.callRateMinutes * 60 * 1000
  );
  const recentActiveCallsCount = await prisma.call.count({
    where: {
      campaignId,
      status: { in: ["pending", "in_progress"] },
      createdAt: { gte: rateWindowStart },
    },
  });

  const availableSlots = Math.max(
    0,
    campaign.callRateCount - recentActiveCallsCount
  );
  if (availableSlots === 0) {
    return { campaignId, callsLaunched: 0, errors: 0, completed: false };
  }

  // Get eligible contacts
  const contacts = await getNextBatchContacts(campaignId, availableSlots);

  if (contacts.length === 0) {
    // Check if campaign is truly complete (no pending/in_progress calls left)
    const activeCalls = await prisma.call.count({
      where: {
        campaignId,
        status: { in: ["pending", "in_progress"] },
      },
    });

    // Check if there are any contacts that could still be retried later
    const totalContacts = await prisma.contact.count({
      where: { campaignId },
    });
    const completedContacts = await prisma.contact.count({
      where: {
        campaignId,
        calls: { some: { status: "completed", campaignId } },
      },
    });
    const maxedOutContacts = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(DISTINCT c.id)::bigint as count
       FROM contacts c
       LEFT JOIN calls cl ON cl."contactId" = c.id AND cl."campaignId" = $1
       WHERE c."campaignId" = $1
       AND c.id NOT IN (
         SELECT "contactId" FROM calls WHERE "campaignId" = $1 AND status = 'completed' AND "contactId" IS NOT NULL
       )
       GROUP BY c.id
       HAVING COUNT(cl.id) > $2`,
      campaignId,
      campaign.maxRetries
    );

    const exhaustedContacts = completedContacts + (maxedOutContacts?.length || 0);

    if (activeCalls === 0 && exhaustedContacts >= totalContacts) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "completed", completedAt: new Date() },
      });
      return { campaignId, callsLaunched: 0, errors: 0, completed: true };
    }

    return { campaignId, callsLaunched: 0, errors: 0, completed: false };
  }

  let callsLaunched = 0;
  let errors = 0;

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    // Round-robin through phone numbers
    const fromNumber = phoneNumberIds[i % phoneNumberIds.length];

    try {
      const retellCall = await createPhoneCall({
        from_number: fromNumber,
        to_number: contact.phone,
        override_agent_id: campaign.agent.retellAgentId,
        metadata: {
          campaignId,
          contactId: contact.id,
          contactName: contact.name,
        },
      });

      await prisma.call.create({
        data: {
          retellCallId: retellCall.call_id,
          status: "pending",
          campaignId,
          contactId: contact.id,
        },
      });

      callsLaunched++;
    } catch (error) {
      await prisma.call.create({
        data: {
          status: "failed",
          campaignId,
          contactId: contact.id,
          metadata: { error: String(error) },
        },
      });
      errors++;
    }
  }

  return { campaignId, callsLaunched, errors, completed: false };
}
