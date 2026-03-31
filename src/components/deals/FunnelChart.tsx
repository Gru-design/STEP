"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

interface StageData {
  name: string;
  count: number;
  conversionRate?: number;
}

interface FunnelChartProps {
  stages: StageData[];
}

const GRADIENT_COLORS = [
  "#2563EB",
  "#3B71EC",
  "#5180ED",
  "#678EEF",
  "#7D9DF0",
  "#0C025F",
];

export function FunnelChart({ stages }: FunnelChartProps) {
  if (stages.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[#64748B]">
        パイプラインデータがありません
      </div>
    );
  }

  const data = stages.map((stage, index) => ({
    ...stage,
    color: GRADIENT_COLORS[index % GRADIENT_COLORS.length],
  }));

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={stages.length * 56 + 24}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fontSize: 13, fill: "#1E293B" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [`${value}件`, "案件数"]}
            contentStyle={{
              border: "1px solid #e2e8f0",
              borderRadius: "0.5rem",
              boxShadow: "none",
            }}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={32}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
            <LabelList
              dataKey="count"
              position="right"
              formatter={(value) => `${value}件`}
              style={{ fontSize: 12, fill: "#64748B" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Conversion rates */}
      <div className="space-y-1 px-2">
        {stages.map((stage, index) => {
          if (index === 0 || stages[index - 1].count === 0) return null;
          const rate = Math.round(
            (stage.count / stages[index - 1].count) * 100
          );
          return (
            <div
              key={stage.name}
              className="flex items-center gap-2 text-xs text-[#64748B]"
            >
              <span>
                {stages[index - 1].name} → {stage.name}
              </span>
              <span className="font-mono font-medium text-[#0C025F]">
                {rate}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
