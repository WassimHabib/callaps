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

const COLORS = ["#7B61FF", "#10b981", "#f59e0b", "#ef4444", "#4DAFFF"];

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
