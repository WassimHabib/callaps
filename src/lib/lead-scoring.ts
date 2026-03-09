interface CallData {
  duration: number | null;
  sentiment: string | null;
  outcome: string | null;
  transcript: string | null;
  summary: string | null;
  status: string;
}

interface LeadScore {
  score: number;
  label: "hot" | "warm" | "cold";
  reason: string;
  nextAction: string;
}

export function scoreLeadFromCall(call: CallData): LeadScore {
  let score = 50;
  const reasons: string[] = [];

  // 1. Call completion
  if (call.status === "completed") {
    score += 15;
    reasons.push("Appel complete");
  } else if (call.status === "no_answer") {
    score -= 30;
    reasons.push("Pas de reponse");
  } else if (call.status === "failed") {
    score -= 20;
    reasons.push("Appel echoue");
  }

  // 2. Duration (longer = more engaged)
  if (call.duration) {
    if (call.duration > 180) {
      score += 20;
      reasons.push("Conversation longue (+3min)");
    } else if (call.duration > 60) {
      score += 10;
      reasons.push("Conversation moyenne (1-3min)");
    } else if (call.duration < 15) {
      score -= 10;
      reasons.push("Appel tres court (-15s)");
    }
  }

  // 3. Sentiment
  if (call.sentiment) {
    const s = call.sentiment.toLowerCase();
    if (s.includes("positive") || s.includes("positif")) {
      score += 15;
      reasons.push("Sentiment positif");
    } else if (s.includes("negative") || s.includes("negatif")) {
      score -= 15;
      reasons.push("Sentiment negatif");
    } else {
      reasons.push("Sentiment neutre");
    }
  }

  // 4. Outcome
  if (call.outcome === "success") {
    score += 15;
    reasons.push("Resultat positif");
  }

  // 5. Transcript keywords (French business signals)
  if (call.transcript) {
    const t = call.transcript.toLowerCase();
    const hotKeywords = [
      "interesse",
      "rendez-vous",
      "devis",
      "prix",
      "quand",
      "comment ca marche",
      "envoyer",
      "rappeler",
      "d'accord",
      "oui je veux",
    ];
    const coldKeywords = [
      "pas interesse",
      "non merci",
      "ne m'appelez plus",
      "raccrocher",
      "liste rouge",
      "deja un fournisseur",
    ];

    const hotHits = hotKeywords.filter((k) => t.includes(k)).length;
    const coldHits = coldKeywords.filter((k) => t.includes(k)).length;

    score += hotHits * 5;
    score -= coldHits * 10;

    if (hotHits > 0) reasons.push(`${hotHits} signal(s) d'interet detecte(s)`);
    if (coldHits > 0) reasons.push(`${coldHits} signal(s) de refus detecte(s)`);
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine label
  let label: "hot" | "warm" | "cold";
  if (score >= 70) label = "hot";
  else if (score >= 40) label = "warm";
  else label = "cold";

  // Determine next action
  let nextAction: string;
  if (label === "hot")
    nextAction = "Contacter rapidement -- lead tres interesse";
  else if (label === "warm")
    nextAction = "Relancer dans 2-3 jours avec plus d'infos";
  else nextAction = "Mettre en nurturing ou exclure des prochaines campagnes";

  return {
    score,
    label,
    reason: reasons.join(" / "),
    nextAction,
  };
}
