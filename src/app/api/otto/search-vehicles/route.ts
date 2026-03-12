import { NextRequest, NextResponse } from "next/server";

const OTTO_API_URL = process.env.OTTO_API_URL || "https://otto-auto.fr";
const OTTO_API_KEY = process.env.OTTO_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const args = body.args || body;

    const response = await fetch(`${OTTO_API_URL}/api/external/search-vehicles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": OTTO_API_KEY,
      },
      body: JSON.stringify(args),
    });

    const data = await response.json();

    // Return just the text result for Retell
    return NextResponse.json(data.result || "Aucun resultat.");
  } catch (error) {
    console.error("Otto search-vehicles proxy error:", error);
    return NextResponse.json("Une erreur est survenue lors de la recherche.");
  }
}
