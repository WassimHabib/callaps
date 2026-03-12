import { prisma } from "./prisma";

interface PeriodFilter {
  orgId?: string;
  start: Date;
  end: Date;
}

/** Get demand counts grouped by category for a period */
export async function getDemandsByCategory(filter: PeriodFilter) {
  const demands = await prisma.callDemand.groupBy({
    by: ["category"],
    where: {
      orgId: filter.orgId,
      createdAt: { gte: filter.start, lte: filter.end },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 20,
  });

  const total = demands.reduce((sum, d) => sum + d._count.id, 0);

  // Get the most recent label for each category
  const labels = new Map<string, string>();
  for (const d of demands) {
    const latest = await prisma.callDemand.findFirst({
      where: {
        orgId: filter.orgId,
        category: d.category,
        createdAt: { gte: filter.start, lte: filter.end },
      },
      orderBy: { createdAt: "desc" },
      select: { label: true },
    });
    labels.set(d.category, latest?.label ?? d.category);
  }

  return demands.map((d) => ({
    category: d.category,
    label: labels.get(d.category) ?? d.category,
    count: d._count.id,
    percentage: total > 0 ? Math.round((d._count.id / total) * 100) : 0,
  }));
}

/** Get total demand count for a period */
export async function getTotalDemands(filter: PeriodFilter) {
  return prisma.callDemand.count({
    where: {
      orgId: filter.orgId,
      createdAt: { gte: filter.start, lte: filter.end },
    },
  });
}

/** Get demands per day for trend chart */
export async function getDemandsPerDay(filter: PeriodFilter) {
  const demands = await prisma.callDemand.findMany({
    where: {
      orgId: filter.orgId,
      createdAt: { gte: filter.start, lte: filter.end },
    },
    select: { category: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Get top 5 categories first
  const catCounts = new Map<string, number>();
  for (const d of demands) {
    catCounts.set(d.category, (catCounts.get(d.category) ?? 0) + 1);
  }
  const topCategories = [...catCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat);

  // Group by date, only top 5 categories
  const byDate = new Map<string, Record<string, number>>();
  for (const d of demands) {
    if (!topCategories.includes(d.category)) continue;
    const date = d.createdAt.toISOString().split("T")[0];
    const entry = byDate.get(date) ?? {};
    entry[d.category] = (entry[d.category] ?? 0) + 1;
    byDate.set(date, entry);
  }

  return {
    categories: topCategories,
    data: [...byDate.entries()].map(([date, counts]) => ({
      date,
      ...counts,
    })),
  };
}

/** Get paginated demand list with call/contact info */
export async function getDemandsList(
  filter: PeriodFilter & {
    page?: number;
    pageSize?: number;
  }
) {
  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 20;

  const where = {
    orgId: filter.orgId,
    createdAt: { gte: filter.start, lte: filter.end },
  };

  const [demands, total] = await Promise.all([
    prisma.callDemand.findMany({
      where,
      include: {
        call: {
          select: {
            startedAt: true,
            contact: { select: { name: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.callDemand.count({ where }),
  ]);

  return {
    demands: demands.map((d) => ({
      id: d.id,
      category: d.category,
      label: d.label,
      details: d.details,
      urgency: d.urgency,
      date: d.createdAt,
      contactName: d.call.contact?.name ?? "Inconnu",
      contactPhone: d.call.contact?.phone ?? "",
    })),
    total,
    pages: Math.ceil(total / pageSize),
  };
}

/** Get weekly reports for an org */
export async function getWeeklyReports(filter: { orgId?: string }) {
  return prisma.weeklyReport.findMany({
    where: filter.orgId ? { orgId: filter.orgId } : {},
    orderBy: { periodStart: "desc" },
    take: 12,
  });
}

/** Compute evolution vs previous period */
export async function getDemandEvolution(filter: PeriodFilter) {
  const periodLength = filter.end.getTime() - filter.start.getTime();
  const prevStart = new Date(filter.start.getTime() - periodLength);
  const prevEnd = new Date(filter.start);

  const [current, previous] = await Promise.all([
    getTotalDemands(filter),
    getTotalDemands({ ...filter, start: prevStart, end: prevEnd }),
  ]);

  const evolution =
    previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

  return { current, previous, evolution };
}
