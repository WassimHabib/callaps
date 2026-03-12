import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

interface ExtractedDemand {
  category: string;
  label: string;
  details: string | null;
  urgency: "low" | "medium" | "high";
}

/**
 * Extract client demands from a call transcript using Claude Haiku.
 * Returns structured demands or empty array on failure.
 */
export async function extractDemandsFromTranscript(
  transcript: string,
  activity: string | null
): Promise<ExtractedDemand[]> {
  if (!transcript || transcript.trim().length < 20) return [];

  const activityContext = activity
    ? `Le professionnel est un(e) ${activity}.`
    : "Le type d'activité du professionnel n'est pas précisé.";

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Analyse ce transcript d'appel téléphonique. ${activityContext}

Extrais chaque demande distincte formulée par le client (l'appelant). Ignore les salutations et formules de politesse.

Si aucune demande claire n'est identifiable, retourne un tableau vide.

Retourne UNIQUEMENT un JSON valide (pas de markdown, pas de texte autour) :
[{ "category": "slug_court", "label": "Libellé lisible en français", "details": "contexte pertinent ou null", "urgency": "low|medium|high" }]

Règles :
- category : slug en snake_case (ex: "fiche_de_paie", "rendez_vous_dermato", "question_fiscale")
- label : phrase courte lisible (ex: "Demande de fiche de paie")
- details : contexte extrait du transcript si pertinent, sinon null
- urgency : "high" si urgent/immédiat, "medium" par défaut, "low" si informatif

Transcript :
${transcript}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (d: Record<string, unknown>) =>
          typeof d.category === "string" && typeof d.label === "string"
      )
      .map((d: Record<string, unknown>) => ({
        category: String(d.category).toLowerCase().replace(/\s+/g, "_").slice(0, 100),
        label: String(d.label).slice(0, 255),
        details: d.details ? String(d.details).slice(0, 500) : null,
        urgency: ["low", "medium", "high"].includes(String(d.urgency))
          ? (String(d.urgency) as "low" | "medium" | "high")
          : "medium",
      }));
  } catch (error) {
    console.error("[demand-extraction] Failed to extract demands:", error);
    return [];
  }
}
