import { prisma } from "@/lib/prisma";

export interface WorkflowRule {
  id: string;
  name: string;
  trigger:
    | "call_completed"
    | "lead_hot"
    | "lead_warm"
    | "lead_cold"
    | "no_answer"
    | "callback_requested";
  action:
    | "email_notification"
    | "sms_followup"
    | "schedule_callback"
    | "tag_contact"
    | "exclude_contact";
  config: {
    email?: string;
    smsMessage?: string;
    callbackDelay?: number;
    tag?: string;
  };
  enabled: boolean;
}

interface CallContext {
  callId: string;
  contactId: string;
  campaignId: string;
  status: string;
  sentiment: string | null;
  outcome: string | null;
  duration: number | null;
  contactPhone: string;
  contactName: string;
  contactEmail: string | null;
  scoreLabel: string | null;
}

export async function executeWorkflows(ctx: CallContext) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: ctx.campaignId },
    select: { workflows: true, name: true },
  });
  if (!campaign) return;

  const workflows = (campaign.workflows as unknown as WorkflowRule[]) || [];
  const logs: string[] = [];

  for (const rule of workflows) {
    if (!rule.enabled) continue;
    if (!shouldTrigger(rule.trigger, ctx)) continue;

    try {
      await executeAction(rule, ctx, campaign.name);
      logs.push(`[OK] ${rule.name}`);
    } catch (err) {
      logs.push(
        `[FAIL] ${rule.name}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // Store workflow execution logs in call metadata
  if (logs.length > 0) {
    const call = await prisma.call.findUnique({
      where: { id: ctx.callId },
      select: { metadata: true },
    });
    const existingMeta = (call?.metadata as Record<string, unknown>) || {};
    await prisma.call.update({
      where: { id: ctx.callId },
      data: {
        metadata: { ...existingMeta, workflowLogs: logs },
      },
    });
  }
}

function shouldTrigger(trigger: string, ctx: CallContext): boolean {
  switch (trigger) {
    case "call_completed":
      return ctx.status === "completed";
    case "no_answer":
      return ctx.status === "no_answer";
    case "lead_hot":
      return ctx.scoreLabel === "hot";
    case "lead_warm":
      return ctx.scoreLabel === "warm";
    case "lead_cold":
      return ctx.scoreLabel === "cold";
    case "callback_requested":
      return false; // Will be enhanced later
    default:
      return false;
  }
}

async function executeAction(
  rule: WorkflowRule,
  ctx: CallContext,
  campaignName: string
) {
  switch (rule.action) {
    case "email_notification": {
      const email = rule.config.email as string;
      if (!email) return;
      const contact = await prisma.contact.findUnique({
        where: { id: ctx.contactId },
        select: { metadata: true },
      });
      const meta = (contact?.metadata as Record<string, unknown>) || {};
      await prisma.contact.update({
        where: { id: ctx.contactId },
        data: {
          metadata: {
            ...meta,
            lastNotification: {
              type: "email",
              to: email,
              subject: `Lead ${ctx.scoreLabel || "nouveau"} - ${ctx.contactName} (${campaignName})`,
              sentAt: new Date().toISOString(),
            },
          },
        },
      });
      break;
    }
    case "tag_contact": {
      const tag = rule.config.tag as string;
      if (!tag) return;
      const contact = await prisma.contact.findUnique({
        where: { id: ctx.contactId },
        select: { metadata: true },
      });
      const meta = (contact?.metadata as Record<string, unknown>) || {};
      const tags = (meta.tags as string[]) || [];
      if (!tags.includes(tag)) {
        await prisma.contact.update({
          where: { id: ctx.contactId },
          data: { metadata: { ...meta, tags: [...tags, tag] } },
        });
      }
      break;
    }
    case "exclude_contact": {
      const contact = await prisma.contact.findUnique({
        where: { id: ctx.contactId },
        select: { metadata: true },
      });
      const meta = (contact?.metadata as Record<string, unknown>) || {};
      await prisma.contact.update({
        where: { id: ctx.contactId },
        data: {
          metadata: {
            ...meta,
            excluded: true,
            excludedAt: new Date().toISOString(),
          },
        },
      });
      break;
    }
    case "schedule_callback": {
      const delayHours = (rule.config.callbackDelay as number) || 24;
      const callbackAt = new Date();
      callbackAt.setHours(callbackAt.getHours() + delayHours);
      const contact = await prisma.contact.findUnique({
        where: { id: ctx.contactId },
        select: { metadata: true },
      });
      const meta = (contact?.metadata as Record<string, unknown>) || {};
      await prisma.contact.update({
        where: { id: ctx.contactId },
        data: {
          metadata: { ...meta, callbackScheduled: callbackAt.toISOString() },
        },
      });
      break;
    }
  }
}
