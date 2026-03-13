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

    // Find the book_cal function config (or check_availability_cal for shared Cal.com creds)
    const functions = (Array.isArray(agent.functions) ? agent.functions : []) as Record<string, unknown>[];
    const calFn = functions.find((fn) => fn.type === "book_cal")
      || functions.find((fn) => fn.type === "check_availability_cal");

    if (!calFn?.calApiKey || !calFn?.calEventTypeId) {
      return NextResponse.json({
        result: "Configuration Cal.com manquante (clé API ou Event Type ID).",
      });
    }

    const body = await request.json();
    const args = body.args || body;
    const { date, time, name, email } = args;

    if (!date || !time || !name) {
      return NextResponse.json({
        result: "Paramètres requis : date (YYYY-MM-DD), time (HH:MM), name.",
      });
    }

    const timezone = (calFn.calTimezone as string) || "Europe/Paris";
    const startTime = `${date}T${time}:00`;

    // Call Cal.com API v1 to create booking
    const calUrl = `https://api.cal.com/v1/bookings?apiKey=${encodeURIComponent(calFn.calApiKey as string)}`;

    console.log("[book-calendar] creating booking on Cal.com", { date, time, name, email });

    const calRes = await fetch(calUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventTypeId: Number(calFn.calEventTypeId),
        start: startTime,
        timeZone: timezone,
        language: "fr",
        responses: {
          name,
          email: email || "noreply@callaps.ai",
        },
        metadata: {
          source: "callaps_agent",
          agentId,
        },
      }),
    });

    if (!calRes.ok) {
      const errText = await calRes.text();
      console.error("[book-calendar] Cal.com error:", calRes.status, errText);
      return NextResponse.json({
        result: "Erreur lors de la réservation. Le créneau n'est peut-être plus disponible.",
      });
    }

    const booking = await calRes.json();

    return NextResponse.json({
      result: `Rendez-vous confirmé le ${date} à ${time} pour ${name}.`,
      booked: true,
      bookingId: booking.id,
      date,
      time,
      name,
    });
  } catch (error) {
    console.error("[book-calendar] error:", error);
    return NextResponse.json({
      result: "Une erreur est survenue lors de la réservation.",
    });
  }
}
