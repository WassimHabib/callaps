import Anthropic from "@anthropic-ai/sdk";

function getAnthropic() {
  return new Anthropic();
}

interface WeeklyData {
  orgId: string;
  periodStart: Date;
  periodEnd: Date;
  totalCalls: number;
  totalDemands: number;
  topCategories: { category: string; label: string; count: number; percentage: number }[];
  kpis: {
    completionRate: number;
    avgDuration: number;
    sentimentPositive: number;
    sentimentNegative: number;
    sentimentNeutral: number;
  };
  previousWeekDemands: number;
  categoryEvolution: { category: string; label: string; current: number; previous: number; change: number }[];
}

interface Recommendation {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  type: "optimization" | "opportunity" | "alert";
}

/**
 * Generate AI-powered recommendations based on weekly call data.
 */
export async function generateRecommendations(
  data: WeeklyData,
  profession: string
): Promise<{ recommendations: Recommendation[]; raw: unknown }> {
  const evolutionText = data.categoryEvolution
    .filter((c) => c.change !== 0)
    .map(
      (c) =>
        `- ${c.label}: ${c.current} demandes (${c.change > 0 ? "+" : ""}${c.change}% vs semaine précédente)`
    )
    .join("\n");

  const prompt = `Tu es un consultant business expert spécialisé dans le domaine suivant : ${profession}.

Analyse ces données d'appels téléphoniques entrants pour la semaine du ${data.periodStart.toLocaleDateString("fr-FR")} au ${data.periodEnd.toLocaleDateString("fr-FR")} et génère 3 à 5 recommandations actionables.

DONNÉES :
- Total appels : ${data.totalCalls}
- Total demandes identifiées : ${data.totalDemands}
- Taux de complétion des appels : ${data.kpis.completionRate}%
- Durée moyenne d'appel : ${Math.round(data.kpis.avgDuration / 60)}min ${data.kpis.avgDuration % 60}s
- Sentiment : ${data.kpis.sentimentPositive} positif / ${data.kpis.sentimentNeutral} neutre / ${data.kpis.sentimentNegative} négatif
- Demandes semaine précédente : ${data.previousWeekDemands}

TOP CATÉGORIES DE DEMANDES :
${data.topCategories.map((c) => `- ${c.label} : ${c.count} (${c.percentage}%)`).join("\n")}

ÉVOLUTION DES CATÉGORIES :
${evolutionText || "Pas de données de comparaison disponibles"}

RÈGLES :
- Chaque recommandation DOIT être spécifique au métier de ${profession}
- Cite les chiffres concrets dans les descriptions
- Sois actionable : le professionnel doit pouvoir agir immédiatement
- Types : "optimization" (processus surchargé), "opportunity" (tendance positive), "alert" (problème/risque)
- Priorité : "high" (action immédiate), "medium" (cette semaine), "low" (à planifier)

Retourne UNIQUEMENT un JSON valide (pas de markdown) :
[{ "title": "...", "description": "...", "priority": "high|medium|low", "type": "optimization|opportunity|alert" }]`;

  try {
    const response = await getAnthropic().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) {
      return { recommendations: [], raw: parsed };
    }

    const recommendations: Recommendation[] = parsed
      .filter(
        (r: Record<string, unknown>) =>
          typeof r.title === "string" && typeof r.description === "string"
      )
      .slice(0, 5)
      .map((r: Record<string, unknown>) => ({
        title: String(r.title),
        description: String(r.description),
        priority: ["high", "medium", "low"].includes(String(r.priority))
          ? (String(r.priority) as Recommendation["priority"])
          : "medium",
        type: ["optimization", "opportunity", "alert"].includes(String(r.type))
          ? (String(r.type) as Recommendation["type"])
          : "optimization",
      }));

    return { recommendations, raw: parsed };
  } catch (error) {
    console.error("[recommendation-engine] Failed:", error);
    return { recommendations: [], raw: { error: String(error) } };
  }
}

/**
 * Detect profession from demand categories when CompanyProfile.activity is empty.
 */
export async function inferProfession(
  topCategories: { category: string; label: string; count: number }[]
): Promise<string> {
  if (topCategories.length === 0) return "professionnel";

  try {
    const response = await getAnthropic().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `À partir de ces catégories de demandes d'appels téléphoniques, déduis le type de professionnel en un ou deux mots (ex: "cabinet comptable", "cabinet médical", "agence immobilière").

Catégories : ${topCategories.map((c) => c.label).join(", ")}

Réponds UNIQUEMENT avec le type de professionnel, rien d'autre.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";
    return text || "professionnel";
  } catch {
    return "professionnel";
  }
}
