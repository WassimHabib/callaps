import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, functions: true },
    });

    if (!agent) {
      return NextResponse.json({ result: "Agent introuvable." }, { status: 404 });
    }

    // Find the check_availability_cal function config
    const functions = (Array.isArray(agent.functions) ? agent.functions : []) as Record<string, unknown>[];
    const calFn = functions.find((fn) => fn.type === "check_availability_cal");

    if (!calFn?.calApiKey || !calFn?.calEventTypeId) {
      return NextResponse.json({
        result: "Configuration Cal.com manquante (clé API ou Event Type ID).",
      });
    }

    const body = await request.json();
    const args = body.args || body;
    const { date } = args;

    if (!date) {
      return NextResponse.json({
        result: "Paramètre 'date' requis (format YYYY-MM-DD).",
      });
    }

    const timezone = (calFn.calTimezone as string) || "Europe/Paris";
    const startTime = `${date}T00:00:00`;
    const endTime = `${date}T23:59:59`;

    // Call Cal.com API v1 for availability
    const calUrl = new URL("https://api.cal.com/v1/slots");
    calUrl.searchParams.set("apiKey", calFn.calApiKey as string);
    calUrl.searchParams.set("eventTypeId", String(calFn.calEventTypeId));
    calUrl.searchParams.set("startTime", startTime);
    calUrl.searchParams.set("endTime", endTime);
    calUrl.searchParams.set("timeZone", timezone);

    console.log("[check-calendar] calling Cal.com", calUrl.toString().replace(calFn.calApiKey as string, "***"));

    const calRes = await fetch(calUrl.toString(), {
      headers: { "Content-Type": "application/json" },
    });

    if (!calRes.ok) {
      const errText = await calRes.text();
      console.error("[check-calendar] Cal.com error:", calRes.status, errText);
      return NextResponse.json({
        result: "Erreur lors de la vérification du calendrier.",
      });
    }

    const calData = await calRes.json();
    const slots = calData.slots || {};

    // Cal.com returns { "YYYY-MM-DD": [{ time: "2026-03-13T09:00:00Z" }, ...] }
    const daySlots = slots[date] || [];

    if (daySlots.length === 0) {
      return NextResponse.json({
        result: `Aucun créneau disponible le ${date}.`,
        available: false,
        slots: [],
      });
    }

    // Format slots for readability
    const formatted = daySlots.map((slot: { time: string }) => {
      const d = new Date(slot.time);
      // Convert to the agent's timezone
      const timeStr = d.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      });
      return timeStr;
    });

    return NextResponse.json({
      result: `Créneaux disponibles le ${date} : ${formatted.join(", ")}.`,
      available: true,
      slots: formatted,
      date,
    });
  } catch (error) {
    console.error("[check-calendar] error:", error);
    return NextResponse.json({
      result: "Une erreur est survenue lors de la vérification du calendrier.",
    });
  }
}
