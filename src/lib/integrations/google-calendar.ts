import type { SyncResult } from "./types";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

/**
 * Test the Google Calendar connection by fetching calendar metadata.
 */
export async function testConnection(
  apiKey: string,
  calendarId: string
): Promise<SyncResult> {
  try {
    const encodedCalendarId = encodeURIComponent(calendarId);
    const res = await fetch(
      `${CALENDAR_API_BASE}/calendars/${encodedCalendarId}?key=${apiKey}`
    );

    if (!res.ok) {
      const body = await res.text();
      return {
        success: false,
        message: `Google Calendar connexion échouée (${res.status}): ${body}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      message: `Google Calendar connecté : ${data.summary || calendarId}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Erreur de connexion Google Calendar: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Create an event in Google Calendar.
 *
 * Note: Creating events requires OAuth2 authentication, which is not yet
 * supported. This is a placeholder that returns an appropriate message.
 */
export async function createEvent(
  _apiKey: string,
  _calendarId: string,
  _event: {
    summary: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    attendeeEmail?: string;
  }
): Promise<SyncResult> {
  return {
    success: false,
    message:
      "Configuration OAuth requise pour créer des événements. Fonctionnalité bientôt disponible.",
  };
}
