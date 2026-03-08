import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Twilio envoie les données de l'appel entrant ici
  // Ce endpoint retourne du TwiML pour gérer la conversation
  const formData = await req.formData();
  const callSid = formData.get("CallSid") as string;
  const from = formData.get("From") as string;
  const to = formData.get("To") as string;

  console.log(`Incoming call: ${callSid} from ${from} to ${to}`);

  // TwiML basique - à remplacer par l'intégration Retell/LiveKit
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR" voice="Polly.Lea">
    Bonjour, merci de votre appel. Un agent va prendre en charge votre conversation.
  </Say>
  <Pause length="1"/>
  <Say language="fr-FR" voice="Polly.Lea">
    Merci et à bientôt.
  </Say>
</Response>`;

  return new NextResponse(twiml, {
    headers: { "Content-Type": "application/xml" },
  });
}
