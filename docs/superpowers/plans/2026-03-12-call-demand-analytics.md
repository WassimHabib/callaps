# Call Demand Analytics & Weekly Insights — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract client demands from call transcripts in real-time, display them in an insights dashboard, and generate weekly AI-powered performance reports with personalized recommendations.

**Architecture:** Real-time extraction in the Retell webhook (Claude Haiku) stores structured `CallDemand` rows. A weekly cron aggregates demands and calls Claude Sonnet for personalized recommendations stored as `WeeklyReport` snapshots. A new `/dashboard/insights` page displays both live demand analytics and weekly reports.

**Tech Stack:** Next.js 16 (App Router), Prisma 7 (PostgreSQL/Neon), Anthropic SDK (Claude Haiku + Sonnet), Resend (email), Recharts (charts), shadcn/ui, Vercel Cron.

---

## Chunk 1: Data Layer & Extraction

### Task 1: Add Prisma models (CallDemand + WeeklyReport)

**Files:**
- Modify: `prisma/schema.prisma:177` (after Call model)

- [ ] **Step 1: Add CallDemand model to schema**

Add after the `Call` model (line 178) in `prisma/schema.prisma`:

```prisma
model CallDemand {
  id        String   @id @default(cuid())
  callId    String
  call      Call     @relation(fields: [callId], references: [id], onDelete: Cascade)
  category  String   // slug: "fiche_de_paie", "rendez_vous_dermato"
  label     String   // human-readable: "Demande de fiche de paie"
  details   String?  // context from transcript
  urgency   String   @default("medium") // "low" | "medium" | "high"
  orgId     String
  createdAt DateTime @default(now())

  @@index([orgId, createdAt])
  @@index([callId])
  @@map("call_demands")
}
```

- [ ] **Step 2: Add WeeklyReport model to schema**

Add after `CallDemand` in `prisma/schema.prisma`:

```prisma
model WeeklyReport {
  id              String    @id @default(cuid())
  orgId           String
  periodStart     DateTime
  periodEnd       DateTime
  totalCalls      Int
  totalDemands    Int
  topCategories   Json      @default("[]")
  kpis            Json      @default("{}")
  recommendations Json      @default("[]")
  profession      String?
  rawAnalysis     Json?
  emailSentAt     DateTime?
  createdAt       DateTime  @default(now())

  @@unique([orgId, periodStart])
  @@index([orgId, createdAt])
  @@map("weekly_reports")
}
```

- [ ] **Step 3: Add `demands` relation to Call model**

In the `Call` model, add before `@@map("calls")` (line 177 in `prisma/schema.prisma`):

```prisma
  demands   CallDemand[]
```

- [ ] **Step 4: Run migration**

Run: `npx prisma migrate dev --name add-call-demands-and-weekly-reports`
Expected: Migration created and applied successfully.

- [ ] **Step 5: Commit**

```bash
git add prisma/
git commit -m "feat: add CallDemand and WeeklyReport Prisma models"
```

---

### Task 2: Install Anthropic SDK

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install @anthropic-ai/sdk**

Run: `npm install @anthropic-ai/sdk`
Expected: Package added to dependencies.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @anthropic-ai/sdk dependency"
```

---

### Task 3: Create demand extraction service

**Files:**
- Create: `src/lib/demand-extraction.ts`

- [ ] **Step 1: Create the extraction module**

Create `src/lib/demand-extraction.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

interface ExtractedDemand {
  category: string;
  label: string;
  details: string | null;
  urgency: "low" | "medium" | "high";
}

/**
 * Extract client demands from a call transcript using Claude Haiku.
 * Returns structured demands or empty array on failure.
 */
export async function extractDemandsFromTranscript(
  transcript: string,
  activity: string | null
): Promise<ExtractedDemand[]> {
  if (!transcript || transcript.trim().length < 20) return [];

  const activityContext = activity
    ? `Le professionnel est un(e) ${activity}.`
    : "Le type d'activité du professionnel n'est pas précisé.";

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Analyse ce transcript d'appel téléphonique. ${activityContext}

Extrais chaque demande distincte formulée par le client (l'appelant). Ignore les salutations et formules de politesse.

Si aucune demande claire n'est identifiable, retourne un tableau vide.

Retourne UNIQUEMENT un JSON valide (pas de markdown, pas de texte autour) :
[{ "category": "slug_court", "label": "Libellé lisible en français", "details": "contexte pertinent ou null", "urgency": "low|medium|high" }]

Règles :
- category : slug en snake_case (ex: "fiche_de_paie", "rendez_vous_dermato", "question_fiscale")
- label : phrase courte lisible (ex: "Demande de fiche de paie")
- details : contexte extrait du transcript si pertinent, sinon null
- urgency : "high" si urgent/immédiat, "medium" par défaut, "low" si informatif

Transcript :
${transcript}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (d: Record<string, unknown>) =>
          typeof d.category === "string" && typeof d.label === "string"
      )
      .map((d: Record<string, unknown>) => ({
        category: String(d.category).toLowerCase().replace(/\s+/g, "_").slice(0, 100),
        label: String(d.label).slice(0, 255),
        details: d.details ? String(d.details).slice(0, 500) : null,
        urgency: ["low", "medium", "high"].includes(String(d.urgency))
          ? (String(d.urgency) as "low" | "medium" | "high")
          : "medium",
      }));
  } catch (error) {
    console.error("[demand-extraction] Failed to extract demands:", error);
    return [];
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/demand-extraction.ts
git commit -m "feat: add demand extraction service using Claude Haiku"
```

---

### Task 4: Integrate extraction into Retell webhook

**Files:**
- Modify: `src/app/api/retell/webhook/route.ts:177-201` (case `call_analyzed`)

- [ ] **Step 1: Add demand extraction after re-scoring in `call_analyzed` handler**

In `src/app/api/retell/webhook/route.ts`, inside the `case "call_analyzed"` block (after line 200, before `break`), add:

```typescript
      // Extract demands from transcript (async, non-blocking)
      extractCallDemands(callId).catch((err) =>
        console.error("[webhook] demand extraction failed:", err)
      );
```

- [ ] **Step 2: Add the `extractCallDemands` helper function**

Add this function at the top of the file (after the existing helper functions, around line 77):

```typescript
async function extractCallDemands(retellCallId: string) {
  const call = await prisma.call.findUnique({
    where: { retellCallId },
    select: {
      id: true,
      transcript: true,
      orgId: true,
      campaign: { select: { orgId: true } },
    },
  });
  if (!call || !call.transcript) return;

  const orgId = call.orgId || call.campaign?.orgId;
  if (!orgId) return;

  // Get company activity for context
  const company = await prisma.companyProfile.findUnique({
    where: { orgId },
    select: { activity: true },
  });

  const { extractDemandsFromTranscript } = await import(
    "@/lib/demand-extraction"
  );
  const demands = await extractDemandsFromTranscript(
    call.transcript,
    company?.activity ?? null
  );

  if (demands.length > 0) {
    await prisma.callDemand.createMany({
      data: demands.map((d) => ({
        callId: call.id,
        category: d.category,
        label: d.label,
        details: d.details,
        urgency: d.urgency,
        orgId,
      })),
    });
  }
}
```

- [ ] **Step 3: Verify the webhook still compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/retell/webhook/route.ts
git commit -m "feat: extract demands from transcripts on call_analyzed webhook"
```

---

## Chunk 2: Insights Data Layer & Dashboard

### Task 5: Create insights stats library

**Files:**
- Create: `src/lib/insights-stats.ts`

- [ ] **Step 1: Create the insights stats module**

Create `src/lib/insights-stats.ts`. This provides all the data queries for the insights dashboard:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/insights-stats.ts
git commit -m "feat: add insights stats library for demand analytics queries"
```

---

### Task 6: Create insights dashboard page

**Files:**
- Create: `src/app/(dashboard)/insights/page.tsx`

- [ ] **Step 1: Create the insights page**

Create `src/app/(dashboard)/insights/page.tsx`:

```typescript
import { getOrgContext, orgFilter } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getDemandsByCategory,
  getDemandEvolution,
  getDemandsList,
  getDemandsPerDay,
  getWeeklyReports,
} from "@/lib/insights-stats";
import {
  MessageSquareText,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Lightbulb,
  FileText,
} from "lucide-react";
import { DemandCategoriesChart } from "@/components/insights/demand-categories-chart";
import { DemandTrendChart } from "@/components/insights/demand-trend-chart";
import { DemandsTable } from "@/components/insights/demands-table";
import { WeeklyReportsList } from "@/components/insights/weekly-reports-list";

interface InsightsPageProps {
  searchParams: Promise<{ period?: string; tab?: string; page?: string }>;
}

function getPeriodDates(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  switch (period) {
    case "30d":
      start.setDate(start.getDate() - 30);
      break;
    case "90d":
      start.setDate(start.getDate() - 90);
      break;
    case "7d":
    default:
      start.setDate(start.getDate() - 7);
      break;
  }
  return { start, end };
}

export default async function InsightsPage({ searchParams }: InsightsPageProps) {
  const params = await searchParams;
  const period = params.period ?? "7d";
  const tab = params.tab ?? "demands";
  const page = parseInt(params.page ?? "1", 10);

  const ctx = await getOrgContext();
  const filter = orgFilter(ctx);
  const { start, end } = getPeriodDates(period);
  const periodFilter = { orgId: filter.orgId, start, end };

  const [categories, evolution, trend, demandsList, reports] =
    await Promise.all([
      getDemandsByCategory(periodFilter),
      getDemandEvolution(periodFilter),
      getDemandsPerDay(periodFilter),
      getDemandsList({ ...periodFilter, page }),
      getWeeklyReports(filter),
    ]);

  const topCategory = categories[0];

  const kpis = [
    {
      title: "Total demandes",
      value: evolution.current.toLocaleString("fr-FR"),
      icon: MessageSquareText,
      gradient: "from-blue-500 to-cyan-400",
      shadow: "shadow-blue-500/20",
      sub: `sur ${period === "7d" ? "7 jours" : period === "30d" ? "30 jours" : "90 jours"}`,
    },
    {
      title: "Catégorie #1",
      value: topCategory?.label ?? "N/A",
      icon: BarChart3,
      gradient: "from-violet-500 to-purple-400",
      shadow: "shadow-violet-500/20",
      sub: topCategory ? `${topCategory.percentage}% des demandes` : "",
    },
    {
      title: "Évolution",
      value:
        evolution.evolution !== null
          ? `${evolution.evolution > 0 ? "+" : ""}${evolution.evolution}%`
          : "N/A",
      icon: evolution.evolution && evolution.evolution > 0 ? TrendingUp : TrendingDown,
      gradient:
        evolution.evolution && evolution.evolution > 0
          ? "from-emerald-500 to-teal-400"
          : "from-red-500 to-orange-400",
      shadow:
        evolution.evolution && evolution.evolution > 0
          ? "shadow-emerald-500/20"
          : "shadow-red-500/20",
      sub: "vs période précédente",
    },
  ];

  const periods = [
    { value: "7d", label: "7 jours" },
    { value: "30d", label: "30 jours" },
    { value: "90d", label: "90 jours" },
  ];

  const tabs = [
    { value: "demands", label: "Analyse des demandes", icon: BarChart3 },
    { value: "reports", label: "Bilans & Recommandations", icon: Lightbulb },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header
        title="Insights"
        description="Analyse des demandes et recommandations IA"
      />
      <div className="space-y-6 p-8">
        {/* Tab Selector */}
        <div className="flex items-center gap-4">
          <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <a
                  key={t.value}
                  href={`/insights?tab=${t.value}&period=${period}`}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-all ${
                    tab === t.value
                      ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </a>
              );
            })}
          </div>

          {tab === "demands" && (
            <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm">
              {periods.map((p) => (
                <a
                  key={p.value}
                  href={`/insights?tab=${tab}&period=${p.value}`}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${
                    period === p.value
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {p.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {tab === "demands" ? (
          <>
            {/* KPI Row */}
            <div className="grid gap-5 sm:grid-cols-3">
              {kpis.map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <Card
                    key={kpi.title}
                    className="border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[13px] font-medium text-slate-500">
                            {kpi.title}
                          </p>
                          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                            {kpi.value}
                          </p>
                        </div>
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${kpi.gradient} shadow-lg ${kpi.shadow}`}
                        >
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <p className="mt-3 text-[12px] text-slate-400">
                        {kpi.sub}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Charts Row */}
            <div className="grid gap-5 lg:grid-cols-2">
              <DemandCategoriesChart data={categories} />
              <DemandTrendChart
                data={trend.data}
                categories={trend.categories}
              />
            </div>

            {/* Detail Table */}
            <DemandsTable
              demands={demandsList.demands}
              total={demandsList.total}
              pages={demandsList.pages}
              currentPage={page}
              period={period}
            />
          </>
        ) : (
          <WeeklyReportsList reports={reports} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/insights/page.tsx
git commit -m "feat: add insights dashboard page with demand analysis and reports tabs"
```

---

### Task 7: Create insights chart components

**Files:**
- Create: `src/components/insights/demand-categories-chart.tsx`
- Create: `src/components/insights/demand-trend-chart.tsx`

- [ ] **Step 1: Create the categories bar chart component**

Create `src/components/insights/demand-categories-chart.tsx`:

```typescript
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  data: { category: string; label: string; count: number; percentage: number }[];
}

export function DemandCategoriesChart({ data }: Props) {
  const top10 = data.slice(0, 10);

  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-[15px] font-semibold text-slate-900">
          Top catégories de demandes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {top10.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">
            Aucune demande sur cette période
          </p>
        ) : (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={top10}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  width={160}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                  formatter={(value: number, _name: string, props: { payload: { percentage: number } }) => [
                    `${value} (${props.payload.percentage}%)`,
                    "Demandes",
                  ]}
                />
                <Bar
                  dataKey="count"
                  fill="#6366f1"
                  radius={[0, 6, 6, 0]}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create the trend line chart component**

Create `src/components/insights/demand-trend-chart.tsx`:

```typescript
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

interface Props {
  data: Record<string, unknown>[];
  categories: string[];
}

function formatDate(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

export function DemandTrendChart({ data, categories }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    dateLabel: formatDate(d.date as string),
  }));

  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-[15px] font-semibold text-slate-900">
          Tendance des demandes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {formatted.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">
            Aucune donnée sur cette période
          </p>
        ) : (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={formatted}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "13px", paddingTop: "8px" }} />
                {categories.map((cat, i) => (
                  <Line
                    key={cat}
                    type="monotone"
                    dataKey={cat}
                    name={cat.replace(/_/g, " ")}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/insights/
git commit -m "feat: add demand categories bar chart and trend line chart components"
```

---

### Task 8: Create demands table and weekly reports list components

**Files:**
- Create: `src/components/insights/demands-table.tsx`
- Create: `src/components/insights/weekly-reports-list.tsx`

- [ ] **Step 1: Create the demands table component**

Create `src/components/insights/demands-table.tsx`:

```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowDown, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

interface Demand {
  id: string;
  category: string;
  label: string;
  details: string | null;
  urgency: string;
  date: Date;
  contactName: string;
  contactPhone: string;
}

interface Props {
  demands: Demand[];
  total: number;
  pages: number;
  currentPage: number;
  period: string;
}

const urgencyConfig = {
  high: { label: "Urgent", icon: AlertTriangle, color: "text-red-600 bg-red-50" },
  medium: { label: "Normal", icon: ArrowRight, color: "text-amber-600 bg-amber-50" },
  low: { label: "Faible", icon: ArrowDown, color: "text-slate-500 bg-slate-50" },
};

export function DemandsTable({ demands, total, pages, currentPage, period }: Props) {
  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-[15px] font-semibold text-slate-900">
          Détail des demandes ({total})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {demands.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Aucune demande sur cette période
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="pb-3 font-medium text-slate-500">Date</th>
                    <th className="pb-3 font-medium text-slate-500">Contact</th>
                    <th className="pb-3 font-medium text-slate-500">Catégorie</th>
                    <th className="pb-3 font-medium text-slate-500">Urgence</th>
                    <th className="pb-3 font-medium text-slate-500">Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {demands.map((d) => {
                    const urgency = urgencyConfig[d.urgency as keyof typeof urgencyConfig] ?? urgencyConfig.medium;
                    const Icon = urgency.icon;
                    return (
                      <tr key={d.id} className="border-b border-slate-50">
                        <td className="py-3 text-slate-600">
                          {new Date(d.date).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3">
                          <p className="font-medium text-slate-800">{d.contactName}</p>
                          <p className="text-xs text-slate-400">{d.contactPhone}</p>
                        </td>
                        <td className="py-3">
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                            {d.label}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${urgency.color}`}>
                            <Icon className="h-3 w-3" />
                            {urgency.label}
                          </span>
                        </td>
                        <td className="max-w-[250px] truncate py-3 text-slate-500">
                          {d.details ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <a
                  href={currentPage > 1 ? `/insights?tab=demands&period=${period}&page=${currentPage - 1}` : "#"}
                  className={`rounded-lg p-2 ${currentPage > 1 ? "hover:bg-slate-100" : "pointer-events-none opacity-30"}`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </a>
                <span className="text-sm text-slate-500">
                  Page {currentPage} / {pages}
                </span>
                <a
                  href={currentPage < pages ? `/insights?tab=demands&period=${period}&page=${currentPage + 1}` : "#"}
                  className={`rounded-lg p-2 ${currentPage < pages ? "hover:bg-slate-100" : "pointer-events-none opacity-30"}`}
                >
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create the weekly reports list component**

Create `src/components/insights/weekly-reports-list.tsx`:

```typescript
"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Settings,
  FileText,
  Calendar,
} from "lucide-react";

interface Report {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  totalCalls: number;
  totalDemands: number;
  topCategories: { category: string; label: string; count: number; percentage: number }[];
  kpis: Record<string, unknown>;
  recommendations: { title: string; description: string; priority: string; type: string }[];
  profession: string | null;
  createdAt: Date;
}

const typeIcons: Record<string, typeof Lightbulb> = {
  optimization: Settings,
  opportunity: TrendingUp,
  alert: AlertTriangle,
};

const priorityColors: Record<string, string> = {
  high: "border-l-red-500 bg-red-50/50",
  medium: "border-l-amber-500 bg-amber-50/50",
  low: "border-l-blue-500 bg-blue-50/50",
};

function formatPeriod(start: Date, end: Date) {
  const s = new Date(start).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const e = new Date(end).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  return `${s} — ${e}`;
}

export function WeeklyReportsList({ reports }: { reports: Report[] }) {
  if (reports.length === 0) {
    return (
      <Card className="border-0 bg-white shadow-sm">
        <CardContent className="py-16 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">
            Aucun bilan hebdomadaire généré pour le moment.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Le premier bilan sera généré lundi prochain.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {(reports as Report[]).map((report) => {
        const recs = (report.recommendations ?? []) as Report["recommendations"];
        const topCats = (report.topCategories ?? []) as Report["topCategories"];

        return (
          <Card key={report.id} className="border-0 bg-white shadow-sm">
            <CardContent className="p-6">
              {/* Header */}
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    <h3 className="text-[15px] font-semibold text-slate-900">
                      Bilan — {formatPeriod(report.periodStart, report.periodEnd)}
                    </h3>
                  </div>
                  {report.profession && (
                    <p className="mt-1 text-xs text-slate-400">
                      Métier : {report.profession}
                    </p>
                  )}
                </div>
                <div className="flex gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-slate-900">{report.totalCalls}</p>
                    <p className="text-[10px] text-slate-400">Appels</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-indigo-600">{report.totalDemands}</p>
                    <p className="text-[10px] text-slate-400">Demandes</p>
                  </div>
                </div>
              </div>

              {/* Top Categories */}
              {topCats.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Top catégories
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {topCats.slice(0, 5).map((cat) => (
                      <span
                        key={cat.category}
                        className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                      >
                        {cat.label} ({cat.percentage}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {recs.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Recommandations IA
                  </p>
                  <div className="space-y-2">
                    {recs.map((rec, i) => {
                      const Icon = typeIcons[rec.type] ?? Lightbulb;
                      const color = priorityColors[rec.priority] ?? priorityColors.medium;
                      return (
                        <div
                          key={i}
                          className={`rounded-lg border-l-4 p-3 ${color}`}
                        >
                          <div className="flex items-start gap-2">
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                            <div>
                              <p className="text-sm font-medium text-slate-800">
                                {rec.title}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-600">
                                {rec.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/insights/
git commit -m "feat: add demands table and weekly reports list components"
```

---

### Task 9: Add Insights to sidebar navigation

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx:26-37`

- [ ] **Step 1: Add Insights link to clientLinks**

In `src/components/layout/app-sidebar.tsx`, add the `Lightbulb` import (line 8 area) and add the insights link after the statistics entry (line 33):

Add `Lightbulb` to the lucide-react import.

Add this entry after the `{ href: "/statistics", ... }` line:

```typescript
  { href: "/insights", label: "Insights IA", icon: Lightbulb },
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "feat: add Insights IA link to sidebar navigation"
```

---

## Chunk 3: Weekly Report Generation & Email

### Task 10: Create recommendation engine

**Files:**
- Create: `src/lib/recommendation-engine.ts`

- [ ] **Step 1: Create the recommendation engine module**

Create `src/lib/recommendation-engine.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

interface WeeklyData {
  orgId: string;
  periodStart: Date;
  periodEnd: Date;
  totalCalls: number;
  totalDemands: number;
  topCategories: { category: string; label: string; count: number; percentage: number }[];
  kpis: {
    completionRate: number;
    avgDuration: number;
    sentimentPositive: number;
    sentimentNegative: number;
    sentimentNeutral: number;
  };
  previousWeekDemands: number;
  categoryEvolution: { category: string; label: string; current: number; previous: number; change: number }[];
}

interface Recommendation {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  type: "optimization" | "opportunity" | "alert";
}

/**
 * Generate AI-powered recommendations based on weekly call data.
 */
export async function generateRecommendations(
  data: WeeklyData,
  profession: string
): Promise<{ recommendations: Recommendation[]; raw: unknown }> {
  const evolutionText = data.categoryEvolution
    .filter((c) => c.change !== 0)
    .map(
      (c) =>
        `- ${c.label}: ${c.current} demandes (${c.change > 0 ? "+" : ""}${c.change}% vs semaine précédente)`
    )
    .join("\n");

  const prompt = `Tu es un consultant business expert spécialisé dans le domaine suivant : ${profession}.

Analyse ces données d'appels téléphoniques entrants pour la semaine du ${data.periodStart.toLocaleDateString("fr-FR")} au ${data.periodEnd.toLocaleDateString("fr-FR")} et génère 3 à 5 recommandations actionables.

DONNÉES :
- Total appels : ${data.totalCalls}
- Total demandes identifiées : ${data.totalDemands}
- Taux de complétion des appels : ${data.kpis.completionRate}%
- Durée moyenne d'appel : ${Math.round(data.kpis.avgDuration / 60)}min ${data.kpis.avgDuration % 60}s
- Sentiment : ${data.kpis.sentimentPositive} positif / ${data.kpis.sentimentNeutral} neutre / ${data.kpis.sentimentNegative} négatif
- Demandes semaine précédente : ${data.previousWeekDemands}

TOP CATÉGORIES DE DEMANDES :
${data.topCategories.map((c) => `- ${c.label} : ${c.count} (${c.percentage}%)`).join("\n")}

ÉVOLUTION DES CATÉGORIES :
${evolutionText || "Pas de données de comparaison disponibles"}

RÈGLES :
- Chaque recommandation DOIT être spécifique au métier de ${profession}
- Cite les chiffres concrets dans les descriptions
- Sois actionable : le professionnel doit pouvoir agir immédiatement
- Types : "optimization" (processus surchargé), "opportunity" (tendance positive), "alert" (problème/risque)
- Priorité : "high" (action immédiate), "medium" (cette semaine), "low" (à planifier)

Retourne UNIQUEMENT un JSON valide (pas de markdown) :
[{ "title": "...", "description": "...", "priority": "high|medium|low", "type": "optimization|opportunity|alert" }]`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) {
      return { recommendations: [], raw: parsed };
    }

    const recommendations: Recommendation[] = parsed
      .filter(
        (r: Record<string, unknown>) =>
          typeof r.title === "string" && typeof r.description === "string"
      )
      .slice(0, 5)
      .map((r: Record<string, unknown>) => ({
        title: String(r.title),
        description: String(r.description),
        priority: ["high", "medium", "low"].includes(String(r.priority))
          ? (String(r.priority) as Recommendation["priority"])
          : "medium",
        type: ["optimization", "opportunity", "alert"].includes(String(r.type))
          ? (String(r.type) as Recommendation["type"])
          : "optimization",
      }));

    return { recommendations, raw: parsed };
  } catch (error) {
    console.error("[recommendation-engine] Failed:", error);
    return { recommendations: [], raw: { error: String(error) } };
  }
}

/**
 * Detect profession from demand categories when CompanyProfile.activity is empty.
 */
export async function inferProfession(
  topCategories: { category: string; label: string; count: number }[]
): Promise<string> {
  if (topCategories.length === 0) return "professionnel";

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `À partir de ces catégories de demandes d'appels téléphoniques, déduis le type de professionnel en un ou deux mots (ex: "cabinet comptable", "cabinet médical", "agence immobilière").

Catégories : ${topCategories.map((c) => c.label).join(", ")}

Réponds UNIQUEMENT avec le type de professionnel, rien d'autre.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";
    return text || "professionnel";
  } catch {
    return "professionnel";
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/recommendation-engine.ts
git commit -m "feat: add AI recommendation engine using Claude Sonnet"
```

---

### Task 11: Create weekly report generation service

**Files:**
- Create: `src/lib/weekly-report.ts`

- [ ] **Step 1: Create the weekly report generation module**

Create `src/lib/weekly-report.ts`:

```typescript
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
      recommendations,
      profession,
      rawAnalysis: raw,
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/weekly-report.ts
git commit -m "feat: add weekly report generation service"
```

---

### Task 12: Create weekly report email service

**Files:**
- Modify: `package.json` (add resend)
- Create: `src/lib/weekly-report-email.ts`

- [ ] **Step 1: Install Resend**

Run: `npm install resend`

- [ ] **Step 2: Create the email service**

Create `src/lib/weekly-report-email.ts`:

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json src/lib/weekly-report-email.ts
git commit -m "feat: add weekly report email service with Resend"
```

---

### Task 13: Create cron API route

**Files:**
- Create: `src/app/api/cron/weekly-report/route.ts`
- Create: `vercel.json` (for Vercel Cron config)

- [ ] **Step 1: Create the cron API route**

Create `src/app/api/cron/weekly-report/route.ts`:

```typescript
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
```

- [ ] **Step 2: Create vercel.json for cron schedule**

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-report",
      "schedule": "0 8 * * 1"
    }
  ]
}
```

This runs every Monday at 8:00 AM UTC.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/weekly-report/route.ts vercel.json
git commit -m "feat: add weekly report cron job API route and Vercel Cron config"
```

---

### Task 14: Add environment variables documentation

**Files:**
- Create: `.env.example` (update if exists)

- [ ] **Step 1: Add required env vars to .env.example**

Add these lines to `.env.example` (create if doesn't exist):

```
# AI — Anthropic (for demand extraction + recommendations)
ANTHROPIC_API_KEY=sk-ant-...

# Email — Resend (for weekly report emails)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Callaps <insights@callaps.com>

# Cron — Secret for Vercel Cron routes
CRON_SECRET=your-random-secret-here

# App URL (for email CTA links)
NEXT_PUBLIC_APP_URL=https://app.callaps.com
```

- [ ] **Step 2: Verify full build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "docs: add env vars for Anthropic, Resend, and Cron"
```
