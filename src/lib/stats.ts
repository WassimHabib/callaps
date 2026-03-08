import { prisma } from "./prisma";

export async function getUserStats(userId: string) {
  const [totalCalls, completedCalls, failedCalls, noAnswerCalls, totalDuration] =
    await Promise.all([
      prisma.call.count({ where: { campaign: { userId } } }),
      prisma.call.count({
        where: { campaign: { userId }, status: "completed" },
      }),
      prisma.call.count({
        where: { campaign: { userId }, status: "failed" },
      }),
      prisma.call.count({
        where: { campaign: { userId }, status: "no_answer" },
      }),
      prisma.call.aggregate({
        where: { campaign: { userId }, duration: { not: null } },
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
