import type { ContactData, SyncResult } from "./types";

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

/**
 * Test the Google Sheets connection by fetching spreadsheet metadata.
 */
export async function testConnection(
  apiKey: string,
  spreadsheetId: string
): Promise<SyncResult> {
  try {
    const res = await fetch(
      `${SHEETS_API_BASE}/${spreadsheetId}?key=${apiKey}&fields=properties.title`
    );

    if (!res.ok) {
      const body = await res.text();
      return {
        success: false,
        message: `Google Sheets connexion échouée (${res.status}): ${body}`,
      };
    }

    const data = await res.json();
    const title = data.properties?.title || spreadsheetId;
    return {
      success: true,
      message: `Google Sheets connecté : ${title}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Erreur de connexion Google Sheets: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Read data from a Google Sheets range.
 */
export async function getSheetData(
  apiKey: string,
  spreadsheetId: string,
  range: string
): Promise<{ success: boolean; data: string[][] | null; message: string }> {
  try {
    const encodedRange = encodeURIComponent(range);
    const res = await fetch(
      `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodedRange}?key=${apiKey}`
    );

    if (!res.ok) {
      const body = await res.text();
      return {
        success: false,
        data: null,
        message: `Erreur lecture Google Sheets (${res.status}): ${body}`,
      };
    }

    const result = await res.json();
    return {
      success: true,
      data: result.values || [],
      message: `${(result.values || []).length} lignes récupérées.`,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      message: `Erreur Google Sheets: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Export contacts to a Google Sheet.
 *
 * Note: Writing to Google Sheets requires OAuth2 authentication, which is not
 * yet supported. This is a placeholder that returns an appropriate message.
 */
export async function exportContacts(
  _apiKey: string,
  _spreadsheetId: string,
  _contacts: ContactData[]
): Promise<SyncResult> {
  return {
    success: false,
    message:
      "OAuth requis pour écrire dans Google Sheets - bientôt disponible.",
  };
}
