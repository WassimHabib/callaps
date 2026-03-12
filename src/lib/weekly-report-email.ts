import { Resend } from "resend";
import { prisma } from "./prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

interface ReportForEmail {
  id: string;
  orgId: string;
  periodStart: Date;
  periodEnd: Date;
  totalCalls: number;
  totalDemands: number;
  topCategories: { label: string; percentage: number }[];
  kpis: { completionRate: number; avgDuration: number };
  recommendations: { title: string; description: string; priority: string; type: string }[];
  profession: string | null;
}

function buildEmailHtml(report: ReportForEmail): string {
  const periodStr = `${new Date(report.periodStart).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} — ${new Date(report.periodEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;

  const topCatsHtml = (report.topCategories ?? [])
    .slice(0, 3)
    .map(
      (c) =>
        `<div style="display:inline-block;background:#eef2ff;color:#4338ca;padding:6px 14px;border-radius:20px;font-size:13px;margin:4px">${c.label} (${c.percentage}%)</div>`
    )
    .join("");

  const recsHtml = (report.recommendations ?? [])
    .map((r) => {
      const colors: Record<string, string> = {
        high: "#ef4444",
        medium: "#f59e0b",
        low: "#3b82f6",
      };
      const color = colors[r.priority] ?? colors.medium;
      return `<div style="border-left:4px solid ${color};padding:12px 16px;margin:8px 0;background:#fafafa;border-radius:0 8px 8px 0">
        <strong style="font-size:14px;color:#1e293b">${r.title}</strong>
        <p style="font-size:13px;color:#475569;margin:4px 0 0">${r.description}</p>
      </div>`;
    })
    .join("");

  const avgMin = Math.floor((report.kpis?.avgDuration ?? 0) / 60);
  const avgSec = (report.kpis?.avgDuration ?? 0) % 60;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
  <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">Bilan Hebdomadaire</h1>
    <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">${periodStr}</p>
  </div>
  <div style="padding:32px">
    <div style="display:flex;gap:16px;margin-bottom:24px;text-align:center">
      <div style="flex:1;background:#f8fafc;border-radius:12px;padding:16px">
        <div style="font-size:28px;font-weight:700;color:#1e293b">${report.totalCalls}</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:4px">Appels</div>
      </div>
      <div style="flex:1;background:#f8fafc;border-radius:12px;padding:16px">
        <div style="font-size:28px;font-weight:700;color:#6366f1">${report.totalDemands}</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:4px">Demandes</div>
      </div>
      <div style="flex:1;background:#f8fafc;border-radius:12px;padding:16px">
        <div style="font-size:28px;font-weight:700;color:#10b981">${report.kpis?.completionRate ?? 0}%</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:4px">Complétion</div>
      </div>
      <div style="flex:1;background:#f8fafc;border-radius:12px;padding:16px">
        <div style="font-size:28px;font-weight:700;color:#8b5cf6">${avgMin}m${avgSec}s</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:4px">Durée moy.</div>
      </div>
    </div>
    <h2 style="font-size:14px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin:24px 0 12px">Top Catégories</h2>
    <div style="margin-bottom:24px">${topCatsHtml || '<p style="color:#94a3b8;font-size:13px">Aucune catégorie</p>'}</div>
    <h2 style="font-size:14px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin:24px 0 12px">Recommandations IA</h2>
    ${recsHtml || '<p style="color:#94a3b8;font-size:13px">Aucune recommandation</p>'}
    <div style="text-align:center;margin-top:32px">
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.callaps.com"}/insights?tab=reports" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:12px 32px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600">Voir le détail dans le dashboard</a>
    </div>
  </div>
  <div style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e2e8f0">
    <p style="font-size:11px;color:#94a3b8;margin:0">Généré automatiquement par Callaps — Insights IA</p>
  </div>
</div>
</body></html>`;
}

/**
 * Send weekly report email to org admin(s).
 */
export async function sendWeeklyReportEmail(report: ReportForEmail) {
  // Find admin user(s) for this org
  // Handles both legacy (orgId = userId) and Clerk org cases
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { id: report.orgId },  // Legacy: orgId = userId
        // For Clerk orgs: find users who own agents/campaigns in this org
        { agents: { some: { orgId: report.orgId } } },
        { campaigns: { some: { orgId: report.orgId } } },
      ],
    },
    select: { email: true, name: true },
    distinct: ["email"],
    take: 5,
  });

  if (users.length === 0) return;

  const html = buildEmailHtml(report);
  const periodStr = `${new Date(report.periodStart).toLocaleDateString("fr-FR")} — ${new Date(report.periodEnd).toLocaleDateString("fr-FR")}`;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "Callaps <insights@callaps.com>",
      to: users.map((u) => u.email),
      subject: `Bilan hebdomadaire — ${periodStr}`,
      html,
    });

    // Mark email as sent
    await prisma.weeklyReport.update({
      where: { id: report.id },
      data: { emailSentAt: new Date() },
    });
  } catch (error) {
    console.error("[weekly-report-email] Failed to send:", error);
  }
}
