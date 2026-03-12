import { prisma } from "./prisma";
import { generateRecommendations, inferProfession } from "./recommendation-engine";

function getLastWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sunday
  const end = new Date(now);
  end.setDate(now.getDate() - dayOfWeek); // Last Sunday
  end.setHours(23, 59, 59, 999);

  const start = new Date(end);
  start.setDate(end.getDate() - 6); // Monday before
  start.setHours(0, 0, 0, 0);

  return { start, end };
}

// Build a Prisma where filter for calls scoped to org
function buildCallFilter(orgId: string) {
  return {
    OR: [
      { campaign: { orgId } },
      { orgId },
    ],
  };
}

async function getWeeklyCallKpis(orgId: string, start: Date, end: Date) {
  const callFilter = buildCallFilter(orgId);
  const dateFilter = { createdAt: { gte: start, lte: end } };

  const [total, completed, calls] = await Promise.all([
    prisma.call.count({ where: { ...callFilter, ...dateFilter } }),
    prisma.call.count({ where: { ...callFilter, ...dateFilter, status: "completed" } }),
    prisma.call.findMany({
      where: { ...callFilter, ...dateFilter },
      select: { duration: true, sentiment: true },
    }),
  ]);

  let totalDuration = 0;
  let sentimentPositive = 0;
  let sentimentNeutral = 0;
  let sentimentNegative = 0;

  for (const call of calls) {
    totalDuration += call.duration ?? 0;
    const s = (call.sentiment ?? "").toLowerCase();
    if (s.includes("positive") || s.includes("positif")) sentimentPositive++;
    else if (s.includes("negative") || s.includes("négatif")) sentimentNegative++;
    else if (call.sentiment) sentimentNeutral++;
  }

  return {
    totalCalls: total,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    avgDuration: total > 0 ? Math.round(totalDuration / total) : 0,
    sentimentPositive,
    sentimentNeutral,
    sentimentNegative,
  };
}

/**
 * Generate weekly report for a single organization.
 */
export async function generateWeeklyReportForOrg(orgId: string) {
  const { start, end } = getLastWeekRange();

  // Check if report already exists for this period
  const existing = await prisma.weeklyReport.findUnique({
    where: { orgId_periodStart: { orgId, periodStart: start } },
  });
  if (existing) return existing;

  // Get KPIs
  const kpis = await getWeeklyCallKpis(orgId, start, end);
  if (kpis.totalCalls === 0) return null; // No calls = no report

  // Get demand categories for current week
  const demands = await prisma.callDemand.groupBy({
    by: ["category", "label"],
    where: { orgId, createdAt: { gte: start, lte: end } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 20,
  });

  const totalDemands = demands.reduce((sum, d) => sum + d._count.id, 0);
  const topCategories = demands.map((d) => ({
    category: d.category,
    label: d.label,
    count: d._count.id,
    percentage: totalDemands > 0 ? Math.round((d._count.id / totalDemands) * 100) : 0,
  }));

  // Get previous week demands for evolution
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - 7);
  const prevEnd = new Date(start);
  prevEnd.setMilliseconds(-1);

  const prevDemands = await prisma.callDemand.groupBy({
    by: ["category", "label"],
    where: { orgId, createdAt: { gte: prevStart, lte: prevEnd } },
    _count: { id: true },
  });

  const prevDemandsTotal = prevDemands.reduce((sum, d) => sum + d._count.id, 0);
  const prevMap = new Map(prevDemands.map((d) => [d.category, d._count.id]));

  const categoryEvolution = topCategories.map((c) => {
    const prev = prevMap.get(c.category) ?? 0;
    return {
      category: c.category,
      label: c.label,
      current: c.count,
      previous: prev,
      change: prev > 0 ? Math.round(((c.count - prev) / prev) * 100) : 100,
    };
  });

  // Get profession
  const company = await prisma.companyProfile.findUnique({
    where: { orgId },
    select: { activity: true },
  });

  let profession = company?.activity ?? "";
  if (!profession) {
    profession = await inferProfession(topCategories);
  }

  // Generate AI recommendations
  const { recommendations, raw } = await generateRecommendations(
    {
      orgId,
      periodStart: start,
      periodEnd: end,
      totalCalls: kpis.totalCalls,
      totalDemands,
      topCategories,
      kpis,
      previousWeekDemands: prevDemandsTotal,
      categoryEvolution,
    },
    profession
  );

  // Save report
  const report = await prisma.weeklyReport.create({
    data: {
      orgId,
      periodStart: start,
      periodEnd: end,
      totalCalls: kpis.totalCalls,
      totalDemands,
      topCategories,
      kpis,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recommendations: recommendations as any,
      profession,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rawAnalysis: raw as any,
    },
  });

  return report;
}

/**
 * Generate weekly reports for ALL orgs that had calls last week.
 */
export async function generateAllWeeklyReports() {
  const { start, end } = getLastWeekRange();

  // Find all orgIds that had calls last week
  const callsWithOrg = await prisma.call.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { orgId: true, campaign: { select: { orgId: true } } },
    distinct: ["orgId"],
  });

  const orgIds = new Set<string>();
  for (const call of callsWithOrg) {
    if (call.orgId) orgIds.add(call.orgId);
    if (call.campaign?.orgId) orgIds.add(call.campaign.orgId);
  }

  // Also check campaigns directly
  const campaigns = await prisma.campaign.findMany({
    where: {
      calls: { some: { createdAt: { gte: start, lte: end } } },
    },
    select: { orgId: true },
    distinct: ["orgId"],
  });

  for (const c of campaigns) {
    if (c.orgId) orgIds.add(c.orgId);
  }

  const results: { orgId: string; success: boolean; error?: string }[] = [];

  for (const orgId of orgIds) {
    try {
      await generateWeeklyReportForOrg(orgId);
      results.push({ orgId, success: true });
    } catch (error) {
      console.error(`[weekly-report] Failed for org ${orgId}:`, error);
      results.push({ orgId, success: false, error: String(error) });
    }
  }

  return results;
}
