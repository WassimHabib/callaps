"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SentimentChartProps {
  data: { positive: number; neutral: number; negative: number };
}

const COLORS = {
  Positif: "#10b981",
  Neutre: "#64748b",
  Negatif: "#ef4444",
};

export function SentimentChart({ data }: SentimentChartProps) {
  const total = data.positive + data.neutral + data.negative;
  const chartData = [
    { name: "Positif", value: data.positive },
    { name: "Neutre", value: data.neutral },
    { name: "Negatif", value: data.negative },
  ].filter(d => d.value > 0);

  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-[15px] font-semibold text-slate-900">
          Sentiment des appels
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {total === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Aucune donnée de sentiment
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[entry.name as keyof typeof COLORS]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${value} (${total > 0 ? Math.round((Number(value) / total) * 100) : 0}%)`,
                    `${name}`,
                  ]}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                />
                <Legend
                  formatter={(value: string) => {
                    const item = chartData.find(d => d.name === value);
                    const pct = item && total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return `${value} (${pct}%)`;
                  }}
                  wrapperStyle={{ fontSize: "13px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
