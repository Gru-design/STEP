"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { chartColors } from "@/lib/chart-theme";

interface SubmissionTrendChartProps {
  data: { week: string; rate: number }[];
}

export function SubmissionTrendChart({ data }: SubmissionTrendChartProps) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 12, fill: chartColors.mutedForeground }}
          axisLine={{ stroke: chartColors.border }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 12, fill: chartColors.mutedForeground }}
          axisLine={{ stroke: chartColors.border }}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip
          formatter={(value) => [`${value}%`, "提出率"]}
          contentStyle={{
            border: `1px solid ${chartColors.border}`,
            borderRadius: "0.75rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            fontSize: "0.875rem",
          }}
        />
        <Line
          type="monotone"
          dataKey="rate"
          stroke={chartColors.primary}
          strokeWidth={2.5}
          dot={{ r: 5, fill: chartColors.primary, strokeWidth: 2, stroke: "#fff" }}
          activeDot={{ r: 7, fill: chartColors.primary }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
