"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HoursChartProps {
  data: { hour: number; label: string; total: number; completed: number }[];
}

export function HoursChart({ data }: HoursChartProps) {
  // Filter to show mainly business hours (08h-20h) but include any hour with data
  const filtered = data.filter(
    d => (d.hour >= 8 && d.hour <= 20) || d.total > 0
  );

  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-[15px] font-semibold text-slate-900">
          Meilleurs horaires d&apos;appel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filtered} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <XAxis
                dataKey="label"
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
                formatter={(value, name) => [
                  `${value}`,
                  name === "total" ? "Total" : "Completés",
                ]}
              />
              <Bar
                dataKey="total"
                fill="#7B61FF"
                radius={[4, 4, 0, 0]}
                name="total"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
