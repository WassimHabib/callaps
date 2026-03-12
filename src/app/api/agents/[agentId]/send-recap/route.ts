import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Callaps <insights@callaps.com>";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildRecapHtml(data: {
  agentName: string;
  caller_name: string;
  caller_phone: string;
  caller_email?: string;
  subject: string;
  summary: string;
  vehicle_info?: string;
}) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;">Callaps</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Recapitulatif d'appel — ${escapeHtml(data.agentName)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 24px;color:#1A1A1A;font-size:20px;">${escapeHtml(data.subject)}</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="padding:12px 16px;background-color:#f9fafb;border-radius:8px;">
                  <p style="margin:0 0 4px;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Appelant</p>
                  <p style="margin:0;font-size:16px;color:#1A1A1A;font-weight:600;">${escapeHtml(data.caller_name)}</p>
                </td>
              </tr>
              <tr><td style="height:8px;"></td></tr>
              <tr>
                <td style="padding:12px 16px;background-color:#f9fafb;border-radius:8px;">
                  <p style="margin:0 0 4px;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Telephone</p>
                  <p style="margin:0;font-size:16px;color:#1A1A1A;"><a href="tel:${escapeHtml(data.caller_phone)}" style="color:#6366f1;text-decoration:none;">${escapeHtml(data.caller_phone)}</a></p>
                </td>
              </tr>
              ${data.caller_email ? `<tr><td style="height:8px;"></td></tr>
              <tr>
                <td style="padding:12px 16px;background-color:#f9fafb;border-radius:8px;">
                  <p style="margin:0 0 4px;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Email</p>
                  <p style="margin:0;font-size:16px;color:#1A1A1A;"><a href="mailto:${escapeHtml(data.caller_email)}" style="color:#6366f1;text-decoration:none;">${escapeHtml(data.caller_email)}</a></p>
                </td>
              </tr>` : ""}
            </table>
            ${data.vehicle_info ? `<div style="padding:16px;background-color:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Vehicule concerne</p>
              <p style="margin:0;font-size:16px;color:#059669;font-weight:600;">${escapeHtml(data.vehicle_info)}</p>
            </div>` : ""}
            <div style="padding:16px;background-color:#f9fafb;border-radius:8px;border-left:4px solid #6366f1;">
              <p style="margin:0 0 4px;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Resume de l'appel</p>
              <p style="margin:0;font-size:15px;color:#1A1A1A;line-height:1.6;white-space:pre-line;">${escapeHtml(data.summary)}</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:13px;color:#9CA3AF;text-align:center;">Cet email a ete genere automatiquement par Callaps.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const body = await request.json();
    const args = body.args || body;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, name: true, notificationEmail: true },
    });

    if (!agent) {
      return NextResponse.json("Agent introuvable.", { status: 404 });
    }

    if (!agent.notificationEmail) {
      return NextResponse.json(
        "Aucun email de notification configure pour cet agent."
      );
    }

    const callerName = (args.caller_name as string) || "Inconnu";
    const callerPhone = (args.caller_phone as string) || "";
    const callerEmail = args.caller_email as string | undefined;
    const subject = (args.subject as string) || "Recapitulatif d'appel";
    const summary = (args.summary as string) || "";
    const vehicleInfo = args.vehicle_info as string | undefined;

    const resend = getResend();
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: agent.notificationEmail,
      subject: `[${agent.name}] ${subject} — ${callerName}`,
      html: buildRecapHtml({
        agentName: agent.name,
        caller_name: callerName,
        caller_phone: callerPhone,
        caller_email: callerEmail,
        subject,
        summary,
        vehicle_info: vehicleInfo,
      }),
    });

    if (error) {
      console.error("Send recap email error:", error);
      return NextResponse.json(
        "Desole, je n'ai pas pu envoyer le recapitulatif par email."
      );
    }

    return NextResponse.json(
      "Le recapitulatif a bien ete envoye par email a l'equipe."
    );
  } catch (error) {
    console.error("Send recap error:", error);
    return NextResponse.json(
      "Une erreur est survenue lors de l'envoi du recapitulatif."
    );
  }
}
