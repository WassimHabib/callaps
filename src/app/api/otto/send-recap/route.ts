import { NextRequest, NextResponse } from "next/server";

const OTTO_API_URL = process.env.OTTO_API_URL || "https://otto-auto.fr";
const OTTO_API_KEY = process.env.OTTO_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const args = body.args || body;

    const response = await fetch(`${OTTO_API_URL}/api/external/send-recap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": OTTO_API_KEY,
      },
      body: JSON.stringify(args),
    });

    const data = await response.json();

    // Return just the text result for Retell
    return NextResponse.json(data.result || "Email envoye.");
  } catch (error) {
    console.error("Otto send-recap proxy error:", error);
    return NextResponse.json("Une erreur est survenue lors de l'envoi du recapitulatif.");
  }
}
