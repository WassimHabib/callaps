import { prisma } from "@/lib/prisma";
import { scoreLeadFromCall } from "@/lib/lead-scoring";
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
  if (!call) return;

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

async function scoreContactFromCall(callId: string) {
  const updatedCall = await prisma.call.findUnique({
    where: { retellCallId: callId },
  });
  if (updatedCall) {
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
  }
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
      await scoreContactFromCall(callId);

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
      await scoreContactFromCall(callId);

      // Re-execute workflows with updated analysis
      await runPostCallWorkflows(callId);
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
