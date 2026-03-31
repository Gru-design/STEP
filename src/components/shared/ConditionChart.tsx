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
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
      <p className="font-medium text-[#1E293B] mb-1">{label}</p>
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
      <div className="flex items-center justify-center h-[200px] text-sm text-[#64748B]">
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
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: "#64748B" }}
          tickLine={false}
          axisLine={{ stroke: "#E2E8F0" }}
        />
        <YAxis
          domain={[1, 5]}
          ticks={[1, 2, 3, 4, 5]}
          tick={{ fontSize: 12, fill: "#64748B" }}
          tickLine={false}
          axisLine={{ stroke: "#E2E8F0" }}
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
          stroke="#2563EB"
          strokeWidth={2}
          dot={{ fill: "#2563EB", r: 3 }}
          activeDot={{ r: 5 }}
          name="individual"
        />
        <Line
          type="monotone"
          dataKey="teamAvg"
          stroke="#94A3B8"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={{ fill: "#94A3B8", r: 3 }}
          activeDot={{ r: 5 }}
          name="teamAvg"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
