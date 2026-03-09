import { prisma } from "./prisma";

export async function getUserStats(userId: string) {
  return getOrgStats({ userId });
}

export async function getOrgStats(filter: { orgId?: string; userId?: string }) {
  const campaignFilter = filter.orgId !== undefined ? { orgId: filter.orgId } : filter.userId ? { userId: filter.userId } : {};

  const [totalCalls, completedCalls, failedCalls, noAnswerCalls, totalDuration] =
    await Promise.all([
      prisma.call.count({ where: { campaign: { ...campaignFilter } } }),
      prisma.call.count({
        where: { campaign: { ...campaignFilter }, status: "completed" },
      }),
      prisma.call.count({
        where: { campaign: { ...campaignFilter }, status: "failed" },
      }),
      prisma.call.count({
        where: { campaign: { ...campaignFilter }, status: "no_answer" },
      }),
      prisma.call.aggregate({
        where: { campaign: { ...campaignFilter }, duration: { not: null } },
        _sum: { duration: true },
        _avg: { duration: true },
      }),
    ]);

  return {
    totalCalls,
    completedCalls,
    failedCalls,
    noAnswerCalls,
    completionRate: totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0,
    totalDuration: totalDuration._sum.duration ?? 0,
    avgDuration: Math.round(totalDuration._avg.duration ?? 0),
  };
}

export async function getCallsPerDay(userId: string, days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const calls = await prisma.call.findMany({
    where: {
      campaign: { userId },
      createdAt: { gte: since },
    },
    select: { createdAt: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  const grouped: Record<string, { date: string; total: number; completed: number }> = {};

  for (const call of calls) {
    const date = call.createdAt.toISOString().split("T")[0];
    if (!grouped[date]) {
      grouped[date] = { date, total: 0, completed: 0 };
    }
    grouped[date].total++;
    if (call.status === "completed") {
      grouped[date].completed++;
    }
  }

  return Object.values(grouped);
}

// Get calls per day for an org (not just userId)
export async function getOrgCallsPerDay(filter: { orgId?: string }, days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const calls = await prisma.call.findMany({
    where: {
      campaign: { ...filter },
      createdAt: { gte: since },
    },
    select: { createdAt: true, status: true, duration: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by date
  const byDate = new Map<string, { total: number; completed: number; failed: number; duration: number }>();
  for (const call of calls) {
    const date = call.createdAt.toISOString().split("T")[0];
    const entry = byDate.get(date) || { total: 0, completed: 0, failed: 0, duration: 0 };
    entry.total++;
    if (call.status === "completed") entry.completed++;
    if (call.status === "failed") entry.failed++;
    entry.duration += call.duration || 0;
    byDate.set(date, entry);
  }

  return Array.from(byDate.entries()).map(([date, data]) => ({ date, ...data }));
}

// Get sentiment distribution
export async function getOrgSentimentDistribution(filter: { orgId?: string }) {
  const calls = await prisma.call.findMany({
    where: { campaign: { ...filter }, sentiment: { not: null } },
    select: { sentiment: true },
  });

  const counts = { positive: 0, neutral: 0, negative: 0 };
  for (const call of calls) {
    const s = (call.sentiment || "").toLowerCase();
    if (s.includes("positive") || s.includes("positif")) counts.positive++;
    else if (s.includes("negative") || s.includes("négatif")) counts.negative++;
    else counts.neutral++;
  }
  return counts;
}

// Get hourly call distribution (best time to call)
export async function getOrgCallsByHour(filter: { orgId?: string }) {
  const calls = await prisma.call.findMany({
    where: { campaign: { ...filter }, startedAt: { not: null } },
    select: { startedAt: true, status: true },
  });

  const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: `${i.toString().padStart(2, "0")}h`,
    total: 0,
    completed: 0,
  }));

  for (const call of calls) {
    if (call.startedAt) {
      const h = call.startedAt.getHours();
      hours[h].total++;
      if (call.status === "completed") hours[h].completed++;
    }
  }
  return hours;
}

// Get duration distribution
export async function getOrgDurationDistribution(filter: { orgId?: string }) {
  const calls = await prisma.call.findMany({
    where: { campaign: { ...filter }, duration: { not: null, gt: 0 } },
    select: { duration: true },
  });

  const buckets = [
    { label: "< 15s", min: 0, max: 15, count: 0 },
    { label: "15-30s", min: 15, max: 30, count: 0 },
    { label: "30s-1m", min: 30, max: 60, count: 0 },
    { label: "1-2m", min: 60, max: 120, count: 0 },
    { label: "2-3m", min: 120, max: 180, count: 0 },
    { label: "3-5m", min: 180, max: 300, count: 0 },
    { label: "> 5m", min: 300, max: Infinity, count: 0 },
  ];

  for (const call of calls) {
    const d = call.duration!;
    const bucket = buckets.find(b => d >= b.min && d < b.max);
    if (bucket) bucket.count++;
  }

  return buckets.map(b => ({ label: b.label, count: b.count }));
}

// Top performing campaigns
export async function getTopCampaigns(filter: { orgId?: string }, limit: number = 5) {
  const campaigns = await prisma.campaign.findMany({
    where: { ...filter },
    include: {
      _count: { select: { calls: true, contacts: true } },
      calls: { select: { status: true, duration: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return campaigns.map(c => {
    const completed = c.calls.filter(call => call.status === "completed").length;
    const total = c.calls.length;
    const avgDuration = total > 0
      ? Math.round(c.calls.reduce((sum, call) => sum + (call.duration || 0), 0) / total)
      : 0;
    return {
      id: c.id,
      name: c.name,
      totalCalls: total,
      completedCalls: completed,
      rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgDuration,
      contactsCount: c._count.contacts,
    };
  });
}
