import type { ContactData, CallActivityData, SyncResult } from "./types";

const HUBSPOT_API_BASE = "https://api.hubapi.com";

function headers(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

/**
 * Test the HubSpot connection by fetching a single contact.
 */
export async function testConnection(accessToken: string): Promise<SyncResult> {
  try {
    const res = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts?limit=1`,
      { headers: headers(accessToken) }
    );

    if (!res.ok) {
      const body = await res.text();
      return {
        success: false,
        message: `HubSpot connexion échouée (${res.status}): ${body}`,
      };
    }

    return { success: true, message: "HubSpot connecté avec succès." };
  } catch (error) {
    return {
      success: false,
      message: `Erreur de connexion HubSpot: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Create a contact in HubSpot CRM.
 */
export async function pushContact(
  accessToken: string,
  contact: ContactData
): Promise<SyncResult> {
  try {
    const nameParts = contact.name.trim().split(/\s+/);
    const firstname = nameParts[0] || "";
    const lastname = nameParts.slice(1).join(" ") || "";

    const properties: Record<string, string> = {
      firstname,
      lastname,
      phone: contact.phone,
    };

    if (contact.email) {
      properties.email = contact.email;
    }
    if (contact.company) {
      properties.company = contact.company;
    }
    if (contact.notes) {
      properties.hs_lead_status = contact.notes;
    }

    const res = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts`,
      {
        method: "POST",
        headers: headers(accessToken),
        body: JSON.stringify({ properties }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      return {
        success: false,
        message: `Erreur création contact HubSpot (${res.status}): ${body}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      message: "Contact créé dans HubSpot.",
      externalId: data.id,
    };
  } catch (error) {
    return {
      success: false,
      message: `Erreur push contact HubSpot: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Create a call engagement in HubSpot.
 */
export async function pushCallActivity(
  accessToken: string,
  data: CallActivityData
): Promise<SyncResult> {
  try {
    const durationMs = data.duration * 1000;

    const properties: Record<string, string> = {
      hs_call_body: data.summary || `Appel avec ${data.contactName}`,
      hs_call_duration: String(durationMs),
      hs_call_direction: "OUTBOUND",
      hs_call_status: "COMPLETED",
      hs_timestamp: data.date.toISOString(),
    };

    if (data.recordingUrl) {
      properties.hs_call_recording_url = data.recordingUrl;
    }

    const res = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/calls`,
      {
        method: "POST",
        headers: headers(accessToken),
        body: JSON.stringify({ properties }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      return {
        success: false,
        message: `Erreur création appel HubSpot (${res.status}): ${body}`,
      };
    }

    const result = await res.json();
    return {
      success: true,
      message: "Activité d'appel créée dans HubSpot.",
      externalId: result.id,
    };
  } catch (error) {
    return {
      success: false,
      message: `Erreur push appel HubSpot: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Pull contacts from HubSpot.
 */
export async function pullContacts(
  accessToken: string,
  limit: number = 100
): Promise<ContactData[]> {
  try {
    const res = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts?limit=${limit}&properties=firstname,lastname,email,phone,company`,
      { headers: headers(accessToken) }
    );

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const contacts: ContactData[] = (data.results || []).map(
      (record: { properties: Record<string, string | null> }) => {
        const props = record.properties;
        const firstname = props.firstname || "";
        const lastname = props.lastname || "";
        const name = [firstname, lastname].filter(Boolean).join(" ");

        return {
          name: name || "Sans nom",
          email: props.email || null,
          phone: props.phone || "",
          company: props.company || null,
          notes: null,
        };
      }
    );

    return contacts;
  } catch {
    return [];
  }
}
