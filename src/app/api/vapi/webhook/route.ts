import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { message } = body;

  if (!message?.type) {
    return NextResponse.json({ ok: true });
  }

  const callId = message.call?.id;

  switch (message.type) {
    case "status-update": {
      if (!callId) break;

      const statusMap: Record<string, string> = {
        queued: "pending",
        ringing: "pending",
        "in-progress": "in_progress",
        forwarding: "in_progress",
        ended: "completed",
      };

      const status = statusMap[message.status] ?? "pending";

      await prisma.call.updateMany({
        where: { vapiCallId: callId },
        data: {
          status: status as "pending" | "in_progress" | "completed" | "failed" | "no_answer",
          ...(message.status === "in-progress" ? { startedAt: new Date() } : {}),
          ...(message.status === "ended" ? { endedAt: new Date() } : {}),
        },
      });
      break;
    }

    case "end-of-call-report": {
      if (!callId) break;

      await prisma.call.updateMany({
        where: { vapiCallId: callId },
        data: {
          status: message.endedReason === "customer-did-not-answer" ? "no_answer" : "completed",
          endedAt: new Date(),
          duration: message.durationSeconds ? Math.round(message.durationSeconds) : null,
          transcript: message.transcript ?? null,
          summary: message.summary ?? null,
          recordingUrl: message.recordingUrl ?? null,
          sentiment: message.analysis?.sentiment ?? null,
          outcome: message.analysis?.successEvaluation ?? null,
        },
      });
      break;
    }

    case "hang": {
      if (!callId) break;
      await prisma.call.updateMany({
        where: { vapiCallId: callId },
        data: {
          status: "completed",
          endedAt: new Date(),
        },
      });
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
