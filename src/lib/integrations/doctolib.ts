import type { SyncResult } from "./types";

// --- Types ---

export interface DoctolibPractitioner {
  id: number;
  name: string;
  specialty: string;
  address: string;
  city: string;
  zipCode: string;
  profileUrl: string;
  avatarUrl?: string;
}

export interface DoctolibVisitMotive {
  id: number;
  name: string;
}

export interface DoctolibAvailability {
  date: string; // "2026-03-12"
  slots: string[]; // ["09:00", "09:30", "10:00"]
}

export interface DoctolibBookingData {
  practitionerId: number;
  practitionerName: string;
  visitMotives: DoctolibVisitMotive[];
  agendaIds: number[];
  practiceIds: number[];
}

// --- Connection test ---

/**
 * Test connection by fetching a practitioner's booking page.
 * Config: { slug: string } - the practitioner's Doctolib slug (e.g. "dr-martin-dupont")
 */
export async function testConnection(slug: string): Promise<SyncResult> {
  try {
    const res = await fetch(
      `https://www.doctolib.fr/booking/${encodeURIComponent(slug)}.json`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; WevlapBot/1.0)",
          Accept: "application/json",
        },
      }
    );
    if (!res.ok) {
      return {
        success: false,
        message: `Praticien introuvable (${res.status}). Verifiez le slug Doctolib.`,
      };
    }
    const data = await res.json();
    const name =
      data.data?.profile?.name_with_title ||
      data.data?.profile?.name ||
      "Praticien";
    return { success: true, message: `Connecte a ${name} sur Doctolib.` };
  } catch (error) {
    return {
      success: false,
      message: `Erreur de connexion Doctolib: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// --- Get booking data (practitioner profile + visit motives + agendas) ---

export async function getBookingData(
  slug: string
): Promise<DoctolibBookingData | null> {
  try {
    const res = await fetch(
      `https://www.doctolib.fr/booking/${encodeURIComponent(slug)}.json`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; WevlapBot/1.0)",
          Accept: "application/json",
        },
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const data = json.data;

    const visitMotives: DoctolibVisitMotive[] = (
      data.visit_motives || []
    ) // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((vm: any) => ({
        id: vm.id,
        name: vm.name,
      }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agendaIds: number[] = (data.agendas || []).map((a: any) => a.id);
    const practiceIds: number[] = (data.places || data.practices || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.id
    );

    return {
      practitionerId: data.profile?.id ?? 0,
      practitionerName:
        data.profile?.name_with_title || data.profile?.name || "Praticien",
      visitMotives,
      agendaIds,
      practiceIds,
    };
  } catch {
    return null;
  }
}

// --- Check availability ---

/**
 * Fetch available slots for a practitioner.
 * Returns availability for the next 7 days starting from startDate.
 */
export async function getAvailabilities(params: {
  slug: string; // Used to get booking data first if needed
  visitMotiveId: number;
  agendaIds: number[];
  practiceIds: number[];
  startDate?: string; // "YYYY-MM-DD", defaults to today
}): Promise<DoctolibAvailability[]> {
  try {
    const startDate =
      params.startDate || new Date().toISOString().split("T")[0];

    const queryParams = new URLSearchParams({
      start_date: startDate,
      visit_motive_ids: String(params.visitMotiveId),
      agenda_ids: params.agendaIds.join("-"),
      practice_ids: params.practiceIds.join("-"),
      insurance_sector: "public",
      limit: "7",
    });

    const res = await fetch(
      `https://www.doctolib.fr/availabilities.json?${queryParams}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; WevlapBot/1.0)",
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) return [];
    const json = await res.json();

    const availabilities: DoctolibAvailability[] = (
      json.availabilities || []
    )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((a: any) => a.slots && a.slots.length > 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((a: any) => ({
        date: a.date,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        slots: a.slots.map((s: any) => {
          // Slots can be strings like "2026-03-12 09:00:00 +0100" or just "09:00"
          if (typeof s === "string" && s.length > 10) {
            // Extract time part "HH:MM"
            const timePart = s.split(" ")[1];
            return timePart ? timePart.substring(0, 5) : s;
          }
          return typeof s === "string" ? s : s.toString();
        }),
      }));

    return availabilities;
  } catch {
    return [];
  }
}

// --- Convenience: Get formatted availability text for AI agent ---

/**
 * Get a human-readable text of available slots.
 * This text can be injected into an agent's system prompt or used during a call.
 */
export async function getAvailabilityText(
  slug: string,
  visitMotiveName?: string
): Promise<string> {
  const bookingData = await getBookingData(slug);
  if (!bookingData)
    return "Impossible de recuperer les disponibilites Doctolib.";

  // Find the right visit motive (or use first one)
  let visitMotive = bookingData.visitMotives[0];
  if (visitMotiveName) {
    const found = bookingData.visitMotives.find((vm) =>
      vm.name.toLowerCase().includes(visitMotiveName.toLowerCase())
    );
    if (found) visitMotive = found;
  }
  if (!visitMotive)
    return "Aucun motif de consultation configure sur Doctolib.";

  const availabilities = await getAvailabilities({
    slug,
    visitMotiveId: visitMotive.id,
    agendaIds: bookingData.agendaIds,
    practiceIds: bookingData.practiceIds,
  });

  if (availabilities.length === 0)
    return "Aucune disponibilite trouvee pour les 7 prochains jours.";

  // Format as readable text
  const dayNames: Record<string, string> = {
    "0": "Dimanche",
    "1": "Lundi",
    "2": "Mardi",
    "3": "Mercredi",
    "4": "Jeudi",
    "5": "Vendredi",
    "6": "Samedi",
  };

  const lines = availabilities.slice(0, 5).map((a) => {
    const date = new Date(a.date);
    const dayName = dayNames[String(date.getDay())];
    const day = date.getDate();
    const month = date.toLocaleDateString("fr-FR", { month: "long" });
    const slotsPreview = a.slots.slice(0, 6).join(", ");
    const more =
      a.slots.length > 6 ? ` (+${a.slots.length - 6} creneaux)` : "";
    return `- ${dayName} ${day} ${month}: ${slotsPreview}${more}`;
  });

  return `Disponibilites pour "${visitMotive.name}" chez ${bookingData.practitionerName}:\n${lines.join("\n")}`;
}
