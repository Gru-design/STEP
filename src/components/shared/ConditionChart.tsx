"use client";

import React from "react";
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
import { chartColors } from "@/lib/chart-theme";

interface ConditionDataPoint {
  date: string;
  individual: number;
  teamAvg: number;
}

interface ConditionChartProps {
  data: ConditionDataPoint[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 text-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.dataKey === "individual" ? "個人" : "チーム平均"}:{" "}
          <span className="font-mono font-semibold">{entry.value.toFixed(1)}</span>
        </p>
      ))}
    </div>
  );
}

export function ConditionChart({ data }: ConditionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
        モチベーションデータがありません
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: chartColors.mutedForeground }}
          tickLine={false}
          axisLine={{ stroke: chartColors.border }}
        />
        <YAxis
          domain={[1, 5]}
          ticks={[1, 2, 3, 4, 5]}
          tick={{ fontSize: 12, fill: chartColors.mutedForeground }}
          tickLine={false}
          axisLine={{ stroke: chartColors.border }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value: string) =>
            value === "individual" ? "個人" : "チーム平均"
          }
          wrapperStyle={{ fontSize: "12px" }}
        />
        <Line
          type="monotone"
          dataKey="individual"
          stroke={chartColors.primary}
          strokeWidth={2}
          dot={{ fill: chartColors.primary, r: 3 }}
          activeDot={{ r: 5 }}
          name="individual"
        />
        <Line
          type="monotone"
          dataKey="teamAvg"
          stroke={chartColors.secondaryLine}
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={{ fill: chartColors.secondaryLine, r: 3 }}
          activeDot={{ r: 5 }}
          name="teamAvg"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
