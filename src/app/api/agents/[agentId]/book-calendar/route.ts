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

    // First check availability via Cal.com v2 slots
    const checkUrl = new URL("https://api.cal.com/v2/slots");
    checkUrl.searchParams.set("eventTypeId", String(calFn.calEventTypeId));
    checkUrl.searchParams.set("start", `${date}T00:00:00.000Z`);
    checkUrl.searchParams.set("end", `${date}T23:59:59.000Z`);
    checkUrl.searchParams.set("timeZone", timezone);

    const checkRes = await fetch(checkUrl.toString(), {
      headers: {
        "Authorization": `Bearer ${calFn.calApiKey as string}`,
        "cal-api-version": "2024-09-04",
        "Content-Type": "application/json",
      },
    });

    if (checkRes.ok) {
      const checkData = await checkRes.json();
      const slotsData = checkData.data?.slots || checkData.slots || {};
      const daySlots = slotsData[date] || [];

      const isAvailable = daySlots.some((slot: { time: string }) => {
        const slotLocal = new Date(slot.time).toLocaleTimeString("fr-FR", {
          hour: "2-digit", minute: "2-digit", timeZone: timezone,
        });
        return slotLocal === time;
      });

      if (!isAvailable) {
        const available = daySlots.map((slot: { time: string }) =>
          new Date(slot.time).toLocaleTimeString("fr-FR", {
            hour: "2-digit", minute: "2-digit", timeZone: timezone,
          })
        );
        return NextResponse.json({
          result: `Le créneau ${time} n'est pas disponible le ${date}. Créneaux disponibles : ${available.join(", ") || "aucun"}.`,
          booked: false,
        });
      }
    }

    // Book via Cal.com v2 bookings
    const startTime = `${date}T${time}:00.000Z`;

    console.log("[book-calendar] creating booking on Cal.com v2", { date, time, name, email });

    const calRes = await fetch("https://api.cal.com/v2/bookings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${calFn.calApiKey as string}`,
        "cal-api-version": "2024-08-13",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventTypeId: Number(calFn.calEventTypeId),
        start: startTime,
        attendee: {
          name,
          email: email || "noreply@callaps.ai",
          timeZone: timezone,
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
    const bookingId = booking.data?.id || booking.id;

    return NextResponse.json({
      result: `Rendez-vous confirmé le ${date} à ${time} pour ${name}.`,
      booked: true,
      bookingId,
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
