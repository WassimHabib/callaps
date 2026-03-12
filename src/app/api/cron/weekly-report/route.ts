import { NextResponse } from "next/server";
import { generateAllWeeklyReports } from "@/lib/weekly-report";
import { sendWeeklyReportEmail } from "@/lib/weekly-report-email";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/weekly-report] CRON_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Generate reports for all orgs
    const results = await generateAllWeeklyReports();

    // Send emails for newly generated reports
    const reportsToEmail = await prisma.weeklyReport.findMany({
      where: {
        emailSentAt: null,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
      },
    });

    for (const report of reportsToEmail) {
      await sendWeeklyReportEmail({
        id: report.id,
        orgId: report.orgId,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        totalCalls: report.totalCalls,
        totalDemands: report.totalDemands,
        topCategories: report.topCategories as { label: string; percentage: number }[],
        kpis: report.kpis as { completionRate: number; avgDuration: number },
        recommendations: report.recommendations as { title: string; description: string; priority: string; type: string }[],
        profession: report.profession,
      });
    }

    return NextResponse.json({
      ok: true,
      generated: results.length,
      emailed: reportsToEmail.length,
      details: results,
    });
  } catch (error) {
    console.error("[cron/weekly-report] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
