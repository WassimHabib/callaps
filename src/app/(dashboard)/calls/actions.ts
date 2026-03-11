"use server";

import { prisma } from "@/lib/prisma";
import { getOrgContext, orgFilter } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getCall } from "@/lib/retell";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface FetchCallsParams {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  campaignId?: string;
  limit?: number;
  offset?: number;
}

export interface CallListItem {
  id: string;
  status: string;
  retellCallId: string | null;
  duration: number | null;
  startedAt: string | null;
  endedAt: string | null;
  transcript: string | null;
  summary: string | null;
  sentiment: string | null;
  outcome: string | null;
  recordingUrl: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  campaignId: string | null;
  contactId: string | null;
  userId: string | null;
  orgId: string | null;
  createdAt: string;
  updatedAt: string;
  contact: {
    id: string;
    name: string;
    phone: string;
    score: number | null;
    scoreLabel: string | null;
  } | null;
  campaign: {
    id: string;
    name: string;
  } | null;
}

export interface FetchCallsResult {
  calls: CallListItem[];
  total: number;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Serialize dates for client transport
// ---------------------------------------------------------------------------
function serializeCall(call: {
  id: string;
  status: string;
  retellCallId: string | null;
  duration: number | null;
  startedAt: Date | null;
  endedAt: Date | null;
  transcript: string | null;
  summary: string | null;
  sentiment: string | null;
  outcome: string | null;
  recordingUrl: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  campaignId: string | null;
  contactId: string | null;
  userId: string | null;
  orgId: string | null;
  createdAt: Date;
  updatedAt: Date;
  contact: {
    id: string;
    name: string;
    phone: string;
    score: number | null;
    scoreLabel: string | null;
  } | null;
  campaign: {
    id: string;
    name: string;
  } | null;
}): CallListItem {
  return {
    ...call,
    startedAt: call.startedAt?.toISOString() ?? null,
    endedAt: call.endedAt?.toISOString() ?? null,
    createdAt: call.createdAt.toISOString(),
    updatedAt: call.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Fetch calls with filters, pagination, and org scoping
// ---------------------------------------------------------------------------
export async function fetchCalls(
  params?: FetchCallsParams
): Promise<FetchCallsResult> {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "analytics:read")) {
    throw new Error("Permission denied");
  }

  const limit = params?.limit ?? 25;
  const offset = params?.offset ?? 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = [];

  // Org scoping: get both campaign calls and standalone calls for this org
  const orgF = orgFilter(ctx);
  if (orgF.orgId) {
    conditions.push({
      OR: [
        { campaign: { orgId: orgF.orgId } },
        { orgId: orgF.orgId },
      ],
    });
  }

  // Search filter (contact name or phone)
  if (params?.search) {
    conditions.push({
      OR: [
        {
          contact: {
            name: { contains: params.search, mode: "insensitive" },
          },
        },
        {
          contact: {
            phone: { contains: params.search, mode: "insensitive" },
          },
        },
      ],
    });
  }

  // Status filter
  if (params?.status) {
    conditions.push({ status: params.status });
  }

  // Date range
  if (params?.dateFrom) {
    conditions.push({
      createdAt: { gte: new Date(params.dateFrom) },
    });
  }
  if (params?.dateTo) {
    // Include the entire end day
    const endDate = new Date(params.dateTo);
    endDate.setHours(23, 59, 59, 999);
    conditions.push({
      createdAt: { lte: endDate },
    });
  }

  // Campaign filter
  if (params?.campaignId) {
    conditions.push({ campaignId: params.campaignId });
  }

  const where = conditions.length > 0 ? { AND: conditions } : {};

  const [calls, total] = await Promise.all([
    prisma.call.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            score: true,
            scoreLabel: true,
          },
        },
        campaign: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.call.count({ where }),
  ]);

  return {
    calls: calls.map(serializeCall),
    total,
    hasMore: offset + limit < total,
  };
}

// ---------------------------------------------------------------------------
// Get single call with full details
// ---------------------------------------------------------------------------
export async function getCallDetail(id: string): Promise<CallListItem> {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "analytics:read")) {
    throw new Error("Permission denied");
  }

  const call = await prisma.call.findUnique({
    where: { id },
    include: {
      contact: {
        select: {
          id: true,
          name: true,
          phone: true,
          score: true,
          scoreLabel: true,
        },
      },
      campaign: {
        select: { id: true, name: true },
      },
    },
  });

  if (!call) {
    throw new Error("Appel non trouvé");
  }

  // Verify org access
  const orgF = orgFilter(ctx);
  if (orgF.orgId) {
    const belongsToOrg =
      call.orgId === orgF.orgId ||
      (call.campaign && call.campaign.id
        ? await prisma.campaign
            .findFirst({
              where: { id: call.campaignId!, orgId: orgF.orgId },
            })
            .then((c) => !!c)
        : false);

    if (!belongsToOrg) {
      throw new Error("Appel non trouvé");
    }
  }

  return serializeCall(call);
}

// ---------------------------------------------------------------------------
// Sync a call from Retell API (useful for missed webhooks)
// ---------------------------------------------------------------------------
export async function syncCallFromRetell(retellCallId: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "analytics:read")) {
    throw new Error("Permission denied");
  }

  // Fetch from Retell API
  const retellData = await getCall(retellCallId);

  // Find existing call in DB
  const existing = await prisma.call.findUnique({
    where: { retellCallId },
  });

  if (!existing) {
    throw new Error("Aucun appel trouvé avec cet identifiant Retell");
  }

  // Map Retell status to our status
  let status: "pending" | "in_progress" | "completed" | "failed" | "no_answer" =
    "completed";
  if (retellData.call_status === "ongoing") {
    status = "in_progress";
  } else if (retellData.call_status === "error") {
    status = "failed";
  } else if (
    retellData.disconnection_reason === "dial_no_answer" ||
    retellData.disconnection_reason === "dial_busy"
  ) {
    status = "no_answer";
  }

  // Update the DB record
  const updated = await prisma.call.update({
    where: { retellCallId },
    data: {
      status,
      duration: retellData.end_timestamp && retellData.start_timestamp
        ? Math.round(
            (retellData.end_timestamp - retellData.start_timestamp) / 1000
          )
        : existing.duration,
      startedAt: retellData.start_timestamp
        ? new Date(retellData.start_timestamp)
        : existing.startedAt,
      endedAt: retellData.end_timestamp
        ? new Date(retellData.end_timestamp)
        : existing.endedAt,
      transcript: retellData.transcript ?? existing.transcript,
      summary: retellData.call_analysis?.call_summary ?? existing.summary,
      sentiment:
        retellData.call_analysis?.user_sentiment ?? existing.sentiment,
      recordingUrl: retellData.recording_url ?? existing.recordingUrl,
      metadata: JSON.parse(JSON.stringify(retellData)),
    },
    include: {
      contact: {
        select: {
          id: true,
          name: true,
          phone: true,
          score: true,
          scoreLabel: true,
        },
      },
      campaign: {
        select: { id: true, name: true },
      },
    },
  });

  return serializeCall(updated);
}

// ---------------------------------------------------------------------------
// Fetch campaigns for filter dropdown
// ---------------------------------------------------------------------------
export async function fetchCampaignsForFilter() {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "analytics:read")) {
    throw new Error("Permission denied");
  }

  const orgF = orgFilter(ctx);
  const campaigns = await prisma.campaign.findMany({
    where: orgF.orgId ? { orgId: orgF.orgId } : {},
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  return campaigns;
}
