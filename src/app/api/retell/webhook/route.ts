import { prisma } from "@/lib/prisma";
import { scoreLeadFromCall } from "@/lib/lead-scoring";
import { deliverWebhook } from "@/lib/webhook-delivery";
import { pushCallToIntegrations, notifySlack } from "@/lib/integrations/sync";
import { sendCallNotification } from "@/lib/integrations/slack";
import { NextResponse } from "next/server";
import { Resend } from "resend";

async function sendAgentNotifications(retellCallId: string) {
  const call = await prisma.call.findUnique({
    where: { retellCallId },
    select: {
      summary: true,
      sentiment: true,
      outcome: true,
      duration: true,
      transcript: true,
      recordingUrl: true,
      metadata: true,
    },
  });
  if (!call) return;

  // Find agent from metadata
  const meta = (typeof call.metadata === "object" && call.metadata !== null ? call.metadata : {}) as Record<string, unknown>;
  const agentId = meta.agentId as string | undefined;
  if (!agentId) return;

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      name: true,
      notificationEmail: true,
      notificationChannels: true,
      userId: true,
    },
  });
  if (!agent) return;

  const channels = Array.isArray(agent.notificationChannels) ? agent.notificationChannels as string[] : [];
  if (channels.length === 0) return;

  const fromNumber = (meta.fromNumber as string) ?? "Inconnu";

  // Email notification
  if (channels.includes("email") && agent.notificationEmail) {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.error("[webhook] RESEND_API_KEY not configured");
        return;
      }
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      console.log("[webhook] sending email notification", { from: fromEmail, to: agent.notificationEmail, agent: agent.name });
      await resend.emails.send({
        from: fromEmail,
        to: agent.notificationEmail,
        subject: `[${agent.name}] Récapitulatif d'appel — ${fromNumber}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:20px 24px;border-radius:12px 12px 0 0;">
            <h2 style="margin:0;color:#fff;">Récapitulatif d'appel</h2>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">${agent.name}</p>
          </div>
          <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;">
            <p style="margin:0 0 8px;font-size:12px;color:#6B7280;text-transform:uppercase;">Appelant</p>
            <p style="margin:0 0 16px;font-size:16px;color:#1A1A1A;font-weight:600;">${fromNumber}</p>
            ${call.summary ? `<p style="margin:0 0 8px;font-size:12px;color:#6B7280;text-transform:uppercase;">Résumé</p>
            <p style="margin:0 0 16px;font-size:15px;color:#1A1A1A;line-height:1.6;white-space:pre-line;">${call.summary}</p>` : ""}
            ${call.sentiment ? `<p style="margin:0 0 8px;font-size:12px;color:#6B7280;text-transform:uppercase;">Sentiment</p>
            <p style="margin:0 0 16px;font-size:15px;color:#1A1A1A;">${call.sentiment}</p>` : ""}
            ${call.duration ? `<p style="margin:0 0 8px;font-size:12px;color:#6B7280;text-transform:uppercase;">Durée</p>
            <p style="margin:0;font-size:15px;color:#1A1A1A;">${Math.floor(call.duration / 60)}m ${call.duration % 60}s</p>` : ""}
          </div>
        </div>`,
      });
    } catch (err) {
      console.error("[webhook] email notification failed:", err);
    }
  }

  // Slack notification
  if (channels.includes("slack") && agent.userId) {
    try {
      const integration = await prisma.integration.findFirst({
        where: { userId: agent.userId, type: "slack", enabled: true },
        select: { config: true },
      });
      if (integration) {
        const config = integration.config as Record<string, unknown>;
        const webhookUrl = config.webhookUrl as string;
        if (webhookUrl) {
          await sendCallNotification(webhookUrl, {
            contactName: fromNumber,
            contactPhone: fromNumber,
            duration: call.duration ?? 0,
            outcome: call.outcome ?? "unknown",
            summary: call.summary,
            transcript: call.transcript,
            sentiment: call.sentiment,
            recordingUrl: call.recordingUrl,
            date: new Date(),
          });
        }
      }
    } catch (err) {
      console.error("[webhook] slack notification failed:", err);
    }
  }
}

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

async function extractCallDemands(retellCallId: string) {
  const call = await prisma.call.findUnique({
    where: { retellCallId },
    select: {
      id: true,
      transcript: true,
      orgId: true,
      campaign: { select: { orgId: true } },
    },
  });
  if (!call || !call.transcript) return;

  const orgId = call.orgId || call.campaign?.orgId;
  if (!orgId) return;

  // Get company activity for context
  const company = await prisma.companyProfile.findUnique({
    where: { orgId },
    select: { activity: true },
  });

  const { extractDemandsFromTranscript } = await import(
    "@/lib/demand-extraction"
  );
  const demands = await extractDemandsFromTranscript(
    call.transcript,
    company?.activity ?? null
  );

  if (demands.length > 0) {
    await prisma.callDemand.createMany({
      data: demands.map((d) => ({
        callId: call.id,
        category: d.category,
        label: d.label,
        details: d.details,
        urgency: d.urgency,
        orgId,
      })),
    });
  }
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
      // Upsert: create the call if it doesn't exist (inbound calls)
      const existingCall = await prisma.call.findUnique({
        where: { retellCallId: callId },
      });
      if (existingCall) {
        await prisma.call.update({
          where: { retellCallId: callId },
          data: { status: "in_progress", startedAt: new Date() },
        });
      } else {
        // Inbound call — find agent by retellAgentId
        const retellAgentId = call.agent_id;
        const agent = retellAgentId
          ? await prisma.agent.findUnique({
              where: { retellAgentId },
              select: { id: true, userId: true, orgId: true },
            })
          : null;

        await prisma.call.create({
          data: {
            retellCallId: callId,
            status: "in_progress",
            startedAt: new Date(),
            userId: agent?.userId ?? null,
            orgId: agent?.orgId ?? null,
            metadata: {
              direction: "inbound",
              agentId: agent?.id ?? null,
              retellAgentId: retellAgentId ?? null,
              fromNumber: call.from_number ?? null,
              toNumber: call.to_number ?? null,
            },
          },
        });
      }
      break;
    }

    case "call_ended": {
      const callData = {
        status: call.disconnection_reason === "no_answer" ? "no_answer" as const : "completed" as const,
        endedAt: new Date(),
        duration: call.duration_ms ? Math.round(call.duration_ms / 1000) : null,
        transcript: call.transcript ?? null,
        summary: call.call_analysis?.call_summary ?? null,
        sentiment: call.call_analysis?.user_sentiment ?? null,
        outcome: call.call_analysis?.call_successful ? "success" : "unknown",
        recordingUrl: call.recording_url ?? null,
      };

      const existingEndCall = await prisma.call.findUnique({
        where: { retellCallId: callId },
      });
      if (existingEndCall) {
        await prisma.call.update({
          where: { retellCallId: callId },
          data: callData,
        });
      } else {
        // Missed call_started — create the call now
        const retellAgentId = call.agent_id;
        const agent = retellAgentId
          ? await prisma.agent.findUnique({
              where: { retellAgentId },
              select: { id: true, userId: true, orgId: true },
            })
          : null;

        await prisma.call.create({
          data: {
            retellCallId: callId,
            ...callData,
            userId: agent?.userId ?? null,
            orgId: agent?.orgId ?? null,
            metadata: {
              direction: "inbound",
              agentId: agent?.id ?? null,
              retellAgentId: retellAgentId ?? null,
              fromNumber: call.from_number ?? null,
              toNumber: call.to_number ?? null,
            },
          },
        });
      }

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
      const analysis = call.call_analysis ?? {};
      const analysisData = {
        summary: analysis.call_summary ?? null,
        sentiment: analysis.user_sentiment ?? null,
        outcome: analysis.call_successful ? "success" : "unknown",
      };

      // Merge post-call analysis custom data into metadata
      const analysisCustomData: Record<string, unknown> = {};
      if (analysis.custom_analysis_data) {
        Object.assign(analysisCustomData, analysis.custom_analysis_data);
      }
      // Also capture known analysis fields
      if (analysis.caller_name) analysisCustomData.caller_name = analysis.caller_name;
      if (analysis.caller_phone) analysisCustomData.caller_phone = analysis.caller_phone;
      if (analysis.call_reason) analysisCustomData.call_reason = analysis.call_reason;

      const existingAnalyzedCall = await prisma.call.findUnique({
        where: { retellCallId: callId },
      });

      if (existingAnalyzedCall) {
        const existingMeta = (typeof existingAnalyzedCall.metadata === "object" && existingAnalyzedCall.metadata !== null
          ? existingAnalyzedCall.metadata : {}) as Record<string, unknown>;
        await prisma.call.update({
          where: { retellCallId: callId },
          data: {
            ...analysisData,
            metadata: JSON.parse(JSON.stringify({ ...existingMeta, analysis: analysisCustomData })),
          },
        });
      } else {
        await prisma.call.updateMany({
          where: { retellCallId: callId },
          data: analysisData,
        });
      }

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

      // Extract demands from transcript (async, non-blocking)
      extractCallDemands(callId).catch((err) =>
        console.error("[webhook] demand extraction failed:", err)
      );

      // Send agent-level notifications (email, slack) — after analysis so summary is included
      sendAgentNotifications(callId).catch((err) =>
        console.error("[webhook] agent notifications failed:", err)
      );
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
