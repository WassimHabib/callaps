import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const OTTO_API_URL = process.env.OTTO_API_URL || "https://viaotto.fr";
const OTTO_API_KEY = process.env.OTTO_API_KEY || "";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true },
    });

    if (!agent) {
      return NextResponse.json("Agent introuvable.", { status: 404 });
    }

    const body = await request.json();
    const args = body.args || body;

    const response = await fetch(
      `${OTTO_API_URL}/api/external/search-vehicles`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": OTTO_API_KEY,
        },
        body: JSON.stringify(args),
      }
    );

    const data = await response.json();

    return NextResponse.json(data.result || "Aucun resultat.");
  } catch (error) {
    console.error("Search vehicles proxy error:", error);
    return NextResponse.json(
      "Une erreur est survenue lors de la recherche."
    );
  }
}
