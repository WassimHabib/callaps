import Anthropic from "@anthropic-ai/sdk";

function getAnthropic() {
  return new Anthropic();
}

const LANG_LABELS: Record<string, string> = {
  "fr-FR": "français",
  "en-US": "English",
  "en-GB": "English",
  "es-ES": "español",
  "de-DE": "Deutsch",
  "ar-SA": "العربية",
  "tr-TR": "Türkçe",
  "pt-BR": "português",
  "it-IT": "italiano",
  "nl-NL": "Nederlands",
  "pl-PL": "polski",
  "ru-RU": "русский",
  "ja-JP": "日本語",
  "zh-CN": "中文",
  "ko-KR": "한국어",
  "multi": "the same language as the conversation",
};

interface CallSummaryResult {
  summary: string;
  sentiment: string;
  callReason: string | null;
}

/**
 * Generate a call summary from transcript using Claude Haiku.
 * Always responds in the agent's configured language.
 */
export async function generateCallSummary(
  transcript: string,
  language: string
): Promise<CallSummaryResult | null> {
  if (!transcript || transcript.trim().length < 20) return null;

  const lang = LANG_LABELS[language] || "français";

  try {
    const response = await getAnthropic().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Analyse ce transcript d'appel téléphonique et réponds UNIQUEMENT en ${lang}.

Retourne UNIQUEMENT un JSON valide (pas de markdown, pas de texte autour) :
{
  "summary": "Résumé concis en 2-3 phrases. Inclure le motif, les points clés et le résultat.",
  "sentiment": "Positif" ou "Neutre" ou "Négatif",
  "callReason": "Raison principale de l'appel en une phrase, ou null"
}

Transcript :
${transcript}`,
        },
      ],
    });

    const raw =
      response.content[0].type === "text" ? response.content[0].text : "";
    const text = raw
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(text);

    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      sentiment: typeof parsed.sentiment === "string" ? parsed.sentiment : "Neutre",
      callReason: typeof parsed.callReason === "string" ? parsed.callReason : null,
    };
  } catch (error) {
    console.error("[call-summary] Failed to generate summary:", error);
    return null;
  }
}
