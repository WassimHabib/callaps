import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendInviteEmail({
  to,
  userName,
  inviteToken,
  adminName,
}: {
  to: string;
  userName: string;
  inviteToken: string;
  adminName: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite/${inviteToken}`;

  await getResend().emails.send({
    from: "Callaps <noreply@callaps.ai>",
    to,
    subject: "Vous avez été invité sur Callaps",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <img src="${baseUrl}/logoV2.png" alt="Callaps" style="height: 40px; margin-bottom: 32px;" />
        <h1 style="font-size: 22px; color: #0f172a; margin-bottom: 8px;">Bienvenue sur Callaps</h1>
        <p style="color: #64748b; font-size: 15px; line-height: 1.6;">
          ${adminName} vous a invité à rejoindre la plateforme Callaps.
          Cliquez sur le bouton ci-dessous pour définir votre mot de passe et activer votre compte.
        </p>
        <a href="${inviteUrl}" style="display: inline-block; margin-top: 24px; padding: 14px 32px; background: #4f46e5; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px;">
          Définir mon mot de passe
        </a>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">
          Ce lien expire dans 48 heures. Si vous n'avez pas demandé cette invitation, ignorez cet email.
        </p>
      </div>
    `,
  });
}
