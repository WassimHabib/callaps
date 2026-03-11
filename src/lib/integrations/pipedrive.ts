import type { ContactData, CallActivityData, SyncResult } from "./types";

function apiUrl(domain: string, path: string, apiToken: string): string {
  return `https://${domain}.pipedrive.com/api/v1${path}?api_token=${apiToken}`;
}

/**
 * Test the Pipedrive connection by fetching the current user.
 */
export async function testConnection(
  apiToken: string,
  domain: string
): Promise<SyncResult> {
  try {
    const res = await fetch(apiUrl(domain, "/users/me", apiToken));

    if (!res.ok) {
      const body = await res.text();
      return {
        success: false,
        message: `Pipedrive connexion échouée (${res.status}): ${body}`,
      };
    }

    const data = await res.json();
    if (!data.success) {
      return {
        success: false,
        message: `Pipedrive connexion échouée: ${data.error || "Erreur inconnue"}`,
      };
    }

    return { success: true, message: "Pipedrive connecté avec succès." };
  } catch (error) {
    return {
      success: false,
      message: `Erreur de connexion Pipedrive: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Create a person (contact) in Pipedrive.
 */
export async function pushContact(
  apiToken: string,
  domain: string,
  contact: ContactData
): Promise<SyncResult> {
  try {
    const body: Record<string, unknown> = {
      name: contact.name,
      phone: [{ value: contact.phone, primary: true }],
    };

    if (contact.email) {
      body.email = [{ value: contact.email, primary: true }];
    }

    if (contact.company) {
      body.org_name = contact.company;
    }

    const res = await fetch(apiUrl(domain, "/persons", apiToken), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        message: `Erreur création contact Pipedrive (${res.status}): ${text}`,
      };
    }

    const data = await res.json();
    if (!data.success) {
      return {
        success: false,
        message: `Erreur Pipedrive: ${data.error || "Erreur inconnue"}`,
      };
    }

    return {
      success: true,
      message: "Contact créé dans Pipedrive.",
      externalId: String(data.data.id),
    };
  } catch (error) {
    return {
      success: false,
      message: `Erreur push contact Pipedrive: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Format a duration in seconds to HH:MM:SS.
 */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [
    String(h).padStart(2, "0"),
    String(m).padStart(2, "0"),
    String(s).padStart(2, "0"),
  ].join(":");
}

/**
 * Create a call activity in Pipedrive.
 */
export async function pushCallActivity(
  apiToken: string,
  domain: string,
  data: CallActivityData
): Promise<SyncResult> {
  try {
    const dueDate = data.date.toISOString().split("T")[0];

    const body: Record<string, unknown> = {
      subject: `Appel avec ${data.contactName}`,
      type: "call",
      note: data.summary || `Résultat: ${data.outcome}`,
      duration: formatDuration(data.duration),
      due_date: dueDate,
      done: 1,
    };

    const res = await fetch(apiUrl(domain, "/activities", apiToken), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        message: `Erreur création activité Pipedrive (${res.status}): ${text}`,
      };
    }

    const result = await res.json();
    if (!result.success) {
      return {
        success: false,
        message: `Erreur Pipedrive: ${result.error || "Erreur inconnue"}`,
      };
    }

    return {
      success: true,
      message: "Activité d'appel créée dans Pipedrive.",
      externalId: String(result.data.id),
    };
  } catch (error) {
    return {
      success: false,
      message: `Erreur push appel Pipedrive: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Pull contacts (persons) from Pipedrive.
 */
export async function pullContacts(
  apiToken: string,
  domain: string,
  limit: number = 100
): Promise<ContactData[]> {
  try {
    const res = await fetch(
      apiUrl(domain, `/persons?limit=${limit}`, apiToken)
    );

    if (!res.ok) {
      return [];
    }

    const result = await res.json();
    if (!result.success || !result.data) {
      return [];
    }

    const contacts: ContactData[] = result.data.map(
      (person: {
        name?: string;
        email?: { value: string }[];
        phone?: { value: string }[];
        org_name?: string;
      }) => {
        const email =
          person.email && person.email.length > 0
            ? person.email[0].value
            : null;
        const phone =
          person.phone && person.phone.length > 0
            ? person.phone[0].value
            : "";

        return {
          name: person.name || "Sans nom",
          email,
          phone,
          company: person.org_name || null,
          notes: null,
        };
      }
    );

    return contacts;
  } catch {
    return [];
  }
}
