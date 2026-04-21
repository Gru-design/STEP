"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, List, FileText } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

interface MyReportEntry {
  id: string;
  report_date: string;
  status: string;
  submitted_at: string | null;
  template_name: string;
}

interface MyReportsViewProps {
  entries: MyReportEntry[];
}

export function MyReportsView({ entries }: MyReportsViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("calendar");

  return (
    <div className="space-y-6">
      {/* Contribution heatmap */}
      <ContributionHeatmap entries={entries} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border border-border bg-white">
          <TabsTrigger value="calendar" className="gap-1.5">
            <CalendarDays className="h-4 w-4" />
            カレンダー
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5">
            <List className="h-4 w-4" />
            リスト
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          <CalendarView
            entries={entries}
            onClickEntry={(id, status) =>
              router.push(
                status === "draft"
                  ? `/reports/${id}/edit`
                  : `/reports/${id}`
              )
            }
          />
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <ListView
            entries={entries}
            onClickEntry={(id, status) =>
              router.push(
                status === "draft"
                  ? `/reports/${id}/edit`
                  : `/reports/${id}`
              )
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ContributionHeatmap({ entries }: { entries: MyReportEntry[] }) {
  const heatmapData = useMemo(() => {
    const today = new Date();
    const days: { date: string; count: number }[] = [];

    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const count = entries.filter(
        (e) => e.report_date === dateStr && e.status === "submitted"
      ).length;
      days.push({ date: dateStr, count });
    }

    return days;
  }, [entries]);

  const getColor = (count: number): string => {
    if (count === 0) return "bg-slate-100";
    if (count === 1) return "bg-emerald-200";
    if (count === 2) return "bg-emerald-400";
    return "bg-emerald-600";
  };

  // Group days into weeks (columns of 7)
  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < heatmapData.length; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7));
  }

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <p className="text-sm font-medium text-foreground mb-3">
          提出状況 (過去90日)
        </p>
        <div className="flex gap-1 overflow-x-auto pb-2">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day) => (
                <div
                  key={day.date}
                  className={`h-3 w-3 rounded-sm ${getColor(day.count)}`}
                  title={`${day.date}: ${day.count}件`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span>少</span>
          <div className="h-3 w-3 rounded-sm bg-slate-100" />
          <div className="h-3 w-3 rounded-sm bg-emerald-200" />
          <div className="h-3 w-3 rounded-sm bg-emerald-400" />
          <div className="h-3 w-3 rounded-sm bg-emerald-600" />
          <span>多</span>
        </div>
      </CardContent>
    </Card>
  );
}

function CalendarView({
  entries,
  onClickEntry,
}: {
  entries: MyReportEntry[];
  onClickEntry: (id: string, status: string) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfWeek = currentMonth.getDay();

  const monthLabel = `${currentMonth.getFullYear()}年${
    currentMonth.getMonth() + 1
  }月`;

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const getEntriesForDate = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(
      currentMonth.getMonth() + 1
    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return entries.filter((e) => e.report_date === dateStr);
  };

  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="text-sm text-accent-color hover:underline"
          >
            前月
          </button>
          <span className="text-sm font-semibold text-primary">
            {monthLabel}
          </span>
          <button
            onClick={nextMonth}
            className="text-sm text-accent-color hover:underline"
          >
            翌月
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-medium text-muted-foreground pb-1"
            >
              {d}
            </div>
          ))}

          {/* Empty cells for offset */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-10" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEntries = getEntriesForDate(day);
            const hasSubmitted = dayEntries.some(
              (e) => e.status === "submitted"
            );
            const hasDraft = dayEntries.some((e) => e.status === "draft");

            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  const submitted = dayEntries.find(
                    (e) => e.status === "submitted"
                  );
                  const target = submitted ?? dayEntries[0];
                  if (target) onClickEntry(target.id, target.status);
                }}
                disabled={dayEntries.length === 0}
                className={`relative flex h-10 items-center justify-center rounded-lg text-sm transition-colors ${
                  dayEntries.length > 0
                    ? "cursor-pointer hover:bg-muted"
                    : "cursor-default"
                }`}
              >
                <span className="text-foreground">{day}</span>
                {hasSubmitted && (
                  <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-success" />
                )}
                {!hasSubmitted && hasDraft && (
                  <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-warning" />
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ListView({
  entries,
  onClickEntry,
}: {
  entries: MyReportEntry[];
  onClickEntry: (id: string, status: string) => void;
}) {
  const statusConfig: Record<string, { label: string; variant: "outline" | "default"; className: string }> = {
    draft: {
      label: "下書き",
      variant: "outline",
      className: "text-warning border-warning",
    },
    submitted: {
      label: "提出済み",
      variant: "outline",
      className: "text-success border-success",
    },
  };

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="まだ日報がありません"
        description="最初の日報を書いて、今日の 1STEP を記録しましょう。"
        action={{ label: "日報を書く", href: "/reports/new" }}
      />
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const config = statusConfig[entry.status] ?? statusConfig.draft;
        return (
          <Card
            key={entry.id}
            className="cursor-pointer border-border transition-colors hover:bg-muted"
            onClick={() => onClickEntry(entry.id, entry.status)}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-foreground">
                  {entry.report_date}
                </span>
                <span className="text-sm text-muted-foreground">
                  {entry.template_name}
                </span>
              </div>
              <Badge variant={config.variant} className={config.className}>
                {config.label}
              </Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
