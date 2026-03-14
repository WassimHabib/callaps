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

    // Cal.com API v2 for slots - no auth needed, just cal-api-version header
    const calUrl = new URL("https://api.cal.com/v2/slots");
    calUrl.searchParams.set("eventTypeId", String(calFn.calEventTypeId));
    calUrl.searchParams.set("start", `${date}T00:00:00Z`);
    calUrl.searchParams.set("end", `${date}T23:59:59Z`);
    calUrl.searchParams.set("timeZone", timezone);

    console.log("[check-calendar] calling Cal.com v2", calUrl.toString());

    const calRes = await fetch(calUrl.toString(), {
      headers: {
        "cal-api-version": "2024-09-04",
      },
    });

    if (!calRes.ok) {
      const errText = await calRes.text();
      console.error("[check-calendar] Cal.com error:", calRes.status, errText);
      return NextResponse.json({
        result: "Erreur lors de la vérification du calendrier.",
      });
    }

    const calData = await calRes.json();
    const slotsData = calData.data?.slots || calData.slots || {};

    // v2 returns { "YYYY-MM-DD": [{ time: "..." }, ...] }
    const daySlots = slotsData[date] || [];

    if (daySlots.length === 0) {
      return NextResponse.json({
        result: `Aucun créneau disponible le ${date}.`,
        available: false,
        slots: [],
      });
    }

    const formatted = daySlots.map((slot: { time: string }) => {
      const d = new Date(slot.time);
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
