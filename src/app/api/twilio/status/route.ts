import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const formData = await req.formData();
  const callSid = formData.get("CallSid") as string;
  const callStatus = formData.get("CallStatus") as string;
  const callDuration = formData.get("CallDuration") as string | null;

  if (!callSid) {
    return new Response("Missing CallSid", { status: 400 });
  }

  const statusMap: Record<string, string> = {
    initiated: "in_progress",
    ringing: "in_progress",
    "in-progress": "in_progress",
    completed: "completed",
    busy: "no_answer",
    "no-answer": "no_answer",
    failed: "failed",
    canceled: "failed",
  };

  const mappedStatus = statusMap[callStatus] ?? "pending";

  await prisma.call.updateMany({
    where: { twilioSid: callSid },
    data: {
      status: mappedStatus as "pending" | "in_progress" | "completed" | "failed" | "no_answer",
      ...(callDuration ? { duration: parseInt(callDuration, 10) } : {}),
      ...(callStatus === "completed" ? { endedAt: new Date() } : {}),
      ...(callStatus === "in-progress" ? { startedAt: new Date() } : {}),
    },
  });

  return new Response("OK", { status: 200 });
}
