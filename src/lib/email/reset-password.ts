import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendResetPasswordEmail({
  to,
  resetToken,
}: {
  to: string;
  resetToken: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password/${resetToken}`;

  await resend.emails.send({
    from: "Callaps <noreply@callaps.ai>",
    to,
    subject: "Réinitialisation de votre mot de passe",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <img src="${baseUrl}/logoV2.png" alt="Callaps" style="height: 40px; margin-bottom: 32px;" />
        <h1 style="font-size: 22px; color: #0f172a; margin-bottom: 8px;">Réinitialisation du mot de passe</h1>
        <p style="color: #64748b; font-size: 15px; line-height: 1.6;">
          Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
        </p>
        <a href="${resetUrl}" style="display: inline-block; margin-top: 24px; padding: 14px 32px; background: #4f46e5; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px;">
          Réinitialiser mon mot de passe
        </a>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">
          Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.
        </p>
      </div>
    `,
  });
}
