import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processCampaignBatch } from "@/lib/campaign-engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify CRON_SECRET for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Find all campaigns that should be processed
    const campaigns = await prisma.campaign.findMany({
      where: {
        OR: [
          { status: "running" },
          {
            status: "scheduled",
            scheduledAt: { lte: new Date() },
          },
        ],
      },
      select: { id: true, name: true, status: true },
    });

    if (campaigns.length === 0) {
      return NextResponse.json({
        message: "No campaigns to process",
        processed: 0,
        results: [],
      });
    }

    const results = [];

    for (const campaign of campaigns) {
      try {
        const result = await processCampaignBatch(campaign.id);
        results.push({
          ...result,
          campaignId: campaign.id,
          name: campaign.name,
        });
      } catch (error) {
        results.push({
          campaignId: campaign.id,
          name: campaign.name,
          error: String(error),
          callsLaunched: 0,
          errors: 1,
          completed: false,
        });
      }
    }

    const totalCalls = results.reduce((sum, r) => sum + r.callsLaunched, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
    const completedCampaigns = results.filter((r) => r.completed).length;

    return NextResponse.json({
      message: `Processed ${campaigns.length} campaign(s)`,
      processed: campaigns.length,
      totalCallsLaunched: totalCalls,
      totalErrors,
      completedCampaigns,
      results,
    });
  } catch (error) {
    console.error("[Campaign Processor] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
