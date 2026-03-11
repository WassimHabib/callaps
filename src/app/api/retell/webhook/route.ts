import { prisma } from "@/lib/prisma";
import { scoreLeadFromCall } from "@/lib/lead-scoring";
import { deliverWebhook } from "@/lib/webhook-delivery";
import { pushCallToIntegrations, notifySlack } from "@/lib/integrations/sync";
import { NextResponse } from "next/server";

async function runPostCallWorkflows(callId: string) {
  const call = await prisma.call.findUnique({
    where: { retellCallId: callId },
    include: {
      contact: {
        select: {
          name: true,
          phone: true,
          email: true,
          score: true,
          scoreLabel: true,
        },
      },
    },
  });
  if (!call || !call.contactId || !call.campaignId || !call.contact) return;

  const { executeWorkflows } = await import("@/lib/workflows");
  await executeWorkflows({
    callId: call.id,
    contactId: call.contactId,
    campaignId: call.campaignId,
    status: call.status,
    sentiment: call.sentiment,
    outcome: call.outcome,
    duration: call.duration,
    contactPhone: call.contact.phone,
    contactName: call.contact.name,
    contactEmail: call.contact.email,
    scoreLabel: call.contact.scoreLabel,
  });
}

async function scoreContactFromCall(callId: string): Promise<string | null> {
  const updatedCall = await prisma.call.findUnique({
    where: { retellCallId: callId },
  });
  if (updatedCall && updatedCall.contactId) {
    const leadScore = scoreLeadFromCall(updatedCall);
    await prisma.contact.update({
      where: { id: updatedCall.contactId },
      data: {
        score: leadScore.score,
        scoreLabel: leadScore.label,
        scoreReason: leadScore.reason,
        nextAction: leadScore.nextAction,
      },
    });
    return leadScore.label;
  }
  return null;
}

async function getCallOrgId(retellCallId: string): Promise<string | null> {
  const call = await prisma.call.findUnique({
    where: { retellCallId },
    select: { orgId: true, campaign: { select: { orgId: true } } },
  });
  if (!call) return null;
  return call.orgId || call.campaign?.orgId || null;
}

async function getCallUserId(retellCallId: string): Promise<string | null> {
  const call = await prisma.call.findUnique({
    where: { retellCallId },
    select: { userId: true, campaign: { select: { userId: true } } },
  });
  if (!call) return null;
  return call.userId || call.campaign?.userId || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCallPayload(call: any): Record<string, unknown> {
  return {
    callId: call.call_id,
    duration: call.duration_ms,
    transcript: call.transcript,
    summary: call.call_analysis?.call_summary ?? null,
    sentiment: call.call_analysis?.user_sentiment ?? null,
    recordingUrl: call.recording_url ?? null,
    disconnectionReason: call.disconnection_reason ?? null,
  };
}

export async function POST(req: Request) {
  const body = await req.json();
  const { event, call } = body;

  if (!event || !call?.call_id) {
    return NextResponse.json({ ok: true });
  }

  const callId = call.call_id;

  switch (event) {
    case "call_started": {
      await prisma.call.updateMany({
        where: { retellCallId: callId },
        data: {
          status: "in_progress",
          startedAt: new Date(),
        },
      });
      break;
    }

    case "call_ended": {
      await prisma.call.updateMany({
        where: { retellCallId: callId },
        data: {
          status: call.disconnection_reason === "no_answer" ? "no_answer" : "completed",
          endedAt: new Date(),
          duration: call.duration_ms ? Math.round(call.duration_ms / 1000) : null,
          transcript: call.transcript ?? null,
          summary: call.call_analysis?.call_summary ?? null,
          sentiment: call.call_analysis?.user_sentiment ?? null,
          outcome: call.call_analysis?.call_successful ? "success" : "unknown",
          recordingUrl: call.recording_url ?? null,
        },
      });

      // Score the lead after call ends
      const scoreLabel = await scoreContactFromCall(callId);

      // Deliver webhooks (async, non-blocking)
      const orgId = await getCallOrgId(callId);
      const callPayload = buildCallPayload(call);
      deliverWebhook("call_ended", callPayload, orgId);

      if (scoreLabel === "hot") deliverWebhook("lead_hot", callPayload, orgId);
      else if (scoreLabel === "warm") deliverWebhook("lead_warm", callPayload, orgId);
      else if (scoreLabel === "cold") deliverWebhook("lead_cold", callPayload, orgId);

      // Push to CRM integrations & Slack (async, non-blocking)
      const callUserId = await getCallUserId(callId);
      if (callUserId) {
        const dbCall = await prisma.call.findUnique({
          where: { retellCallId: callId },
          include: { contact: { select: { name: true, phone: true, email: true, company: true, score: true, scoreLabel: true, scoreReason: true } } },
        });
        if (dbCall) {
          pushCallToIntegrations(callUserId, {
            contactName: dbCall.contact?.name ?? "Inconnu",
            contactPhone: dbCall.contact?.phone ?? "",
            duration: dbCall.duration ?? 0,
            outcome: dbCall.outcome ?? "unknown",
            summary: dbCall.summary,
            transcript: dbCall.transcript,
            sentiment: dbCall.sentiment,
            recordingUrl: dbCall.recordingUrl,
            date: dbCall.startedAt ?? new Date(),
          });
          // Notify Slack for hot/warm leads
          if (dbCall.contact && (scoreLabel === "hot" || scoreLabel === "warm")) {
            notifySlack(callUserId, "lead_detected", {
              name: dbCall.contact.name,
              phone: dbCall.contact.phone,
              score: dbCall.contact.score ?? 0,
              reason: dbCall.contact.scoreReason ?? "",
              company: dbCall.contact.company,
            });
          }
        }
      }

      // Execute post-call workflows
      await runPostCallWorkflows(callId);
      break;
    }

    case "call_analyzed": {
      await prisma.call.updateMany({
        where: { retellCallId: callId },
        data: {
          summary: call.call_analysis?.call_summary ?? null,
          sentiment: call.call_analysis?.user_sentiment ?? null,
          outcome: call.call_analysis?.call_successful ? "success" : "unknown",
        },
      });

      // Re-score with updated analysis data
      const analysisScoreLabel = await scoreContactFromCall(callId);

      // Deliver webhooks (async, non-blocking)
      const analysisOrgId = await getCallOrgId(callId);
      const analysisPayload = buildCallPayload(call);
      deliverWebhook("call_analyzed", analysisPayload, analysisOrgId);

      if (analysisScoreLabel === "hot") deliverWebhook("lead_hot", analysisPayload, analysisOrgId);
      else if (analysisScoreLabel === "warm") deliverWebhook("lead_warm", analysisPayload, analysisOrgId);
      else if (analysisScoreLabel === "cold") deliverWebhook("lead_cold", analysisPayload, analysisOrgId);

      // Re-execute workflows with updated analysis
      await runPostCallWorkflows(callId);
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
