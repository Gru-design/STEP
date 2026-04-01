"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  ArrowLeft,
  ClipboardCheck,
  Star,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { ConditionChart } from "@/components/shared/ConditionChart";
import { ReviewCard } from "@/components/plans/ReviewCard";
import type { User, Role, PlanReview } from "@/types/database";

const roleLabels: Record<Role, string> = {
  super_admin: "スーパーアドミン",
  admin: "管理者",
  manager: "マネージャー",
  member: "メンバー",
};

const roleBadgeColors: Record<Role, string> = {
  super_admin: "bg-danger text-white",
  admin: "bg-primary text-white",
  manager: "bg-accent-color text-white",
  member: "bg-muted text-primary",
};

interface KpiSummaryItem {
  label: string;
  key: string;
  value: number;
  unit?: string;
}

interface ApprovalHistoryItem {
  id: string;
  type: "plan" | "deal";
  title: string;
  status: string;
  date: string;
  comment?: string;
}

interface MotivationPoint {
  date: string;
  individual: number;
  teamAvg: number;
}

interface WeeklyReviewData {
  planId: string;
  weekStart: string;
  executionRate: number | null;
  status: string;
  review: PlanReview | null;
}

interface OneOnOneClientProps {
  targetUser: User;
  teamName?: string;
  kpiSummary: KpiSummaryItem[];
  submissionRate: number;
  submittedDays: number;
  expectedDays: number;
  motivationData: MotivationPoint[];
  approvalHistory: ApprovalHistoryItem[];
  level: number;
  xp: number;
  weeklyReviews?: WeeklyReviewData[];
}

function ApprovalStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-success">
          <CheckCircle className="h-3 w-3" />
          承認
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-danger">
          <XCircle className="h-3 w-3" />
          差戻し
        </span>
      );
    case "submitted":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-accent-color">
          <Clock className="h-3 w-3" />
          申請中
        </span>
      );
    default:
      return null;
  }
}

function SubmissionRateBar({
  rate,
  submitted,
  expected,
}: {
  rate: number;
  submitted: number;
  expected: number;
}) {
  const percentage = Math.round(rate * 100);
  const barColor =
    percentage >= 80
      ? "bg-success"
      : percentage >= 50
        ? "bg-warning"
        : "bg-danger";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-2xl font-mono font-bold text-primary">
          {percentage}%
        </span>
        <span className="text-sm text-muted-foreground">
          {submitted} / {expected} 日
        </span>
      </div>
      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function OneOnOneClient({
  targetUser,
  teamName,
  kpiSummary,
  submissionRate,
  submittedDays,
  expectedDays,
  motivationData,
  approvalHistory,
  level,
  xp,
  weeklyReviews = [],
}: OneOnOneClientProps) {
  const [memo, setMemo] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(`1on1-memo-${targetUser.id}`) ?? "";
  });

  // Save memo to localStorage on change
  useEffect(() => {
    localStorage.setItem(`1on1-memo-${targetUser.id}`, memo);
  }, [memo, targetUser.id]);

  const handlePrint = () => {
    window.print();
  };

  const today = new Date();
  const dateStr = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/team">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-primary">1on1 アジェンダ</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{dateStr}</span>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            印刷
          </Button>
        </div>
      </div>

      {/* Print header (visible only in print) */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold text-primary">
          1on1 アジェンダ - {dateStr}
        </h1>
      </div>

      {/* Target Member */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-primary">
            対象メンバー
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={targetUser.avatar_url ?? undefined} />
              <AvatarFallback className="text-lg font-medium">
                {targetUser.name?.charAt(0) ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {targetUser.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeColors[targetUser.role]}`}
                >
                  {roleLabels[targetUser.role]}
                </span>
                {teamName && (
                  <span className="text-xs text-muted-foreground">{teamName}</span>
                )}
                <span className="text-xs text-muted-foreground">
                  Lv.{level} / {xp.toLocaleString()} XP
                </span>
              </div>
              {targetUser.calendar_url && (
                <a
                  href={targetUser.calendar_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-sm text-accent-color hover:underline print:hidden"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  1on1予約リンク
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Summary + Submission Rate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* KPI Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-primary">
              今週のKPI
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {kpiSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">KPIデータがありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-muted-foreground">
                        項目
                      </th>
                      <th className="text-right py-2 font-medium text-muted-foreground">
                        実績
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpiSummary.map((kpi) => (
                      <tr
                        key={kpi.key}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="py-2 text-foreground">{kpi.label}</td>
                        <td className="py-2 text-right font-mono font-semibold text-primary">
                          {kpi.value.toLocaleString()}
                          {kpi.unit && (
                            <span className="text-xs text-muted-foreground ml-0.5">
                              {kpi.unit}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submission Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-primary">
              提出状況
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <SubmissionRateBar
              rate={submissionRate}
              submitted={submittedDays}
              expected={expectedDays}
            />
          </CardContent>
        </Card>
      </div>

      {/* Motivation Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-primary">
            モチベーション推移（過去4週間）
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ConditionChart data={motivationData} />
        </CardContent>
      </Card>

      {/* Weekly Reviews */}
      {weeklyReviews.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-primary">
              <ClipboardCheck className="h-4 w-4" />
              週次振り返り
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {weeklyReviews.map((wr) => {
              const weekEnd = new Date(wr.weekStart);
              weekEnd.setDate(weekEnd.getDate() + 6);
              const rangeLabel = `${new Date(wr.weekStart).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}`;

              if (wr.review) {
                // Has review - show ReviewCard
                return (
                  <div key={wr.planId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">{rangeLabel}</span>
                      {wr.executionRate !== null && (
                        <span className="text-xs font-mono text-muted-foreground">
                          実行率 {Math.round(wr.executionRate)}%
                        </span>
                      )}
                    </div>
                    <ReviewCard
                      review={wr.review}
                      isManager={true}
                      planId={wr.planId}
                    />
                  </div>
                );
              }

              // No review yet - show pending notice
              return (
                <div
                  key={wr.planId}
                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">振り返り未提出</p>
                      <p className="text-xs text-muted-foreground">{rangeLabel}</p>
                    </div>
                  </div>
                  {wr.executionRate !== null && (
                    <span className="text-xs font-mono text-muted-foreground">
                      実行率 {Math.round(wr.executionRate)}%
                    </span>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Approval History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-primary">
            承認履歴
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {approvalHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">承認履歴がありません</p>
          ) : (
            <div className="space-y-3">
              {approvalHistory.map((item) => {
                const d = new Date(item.date);
                const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted transition-colors"
                  >
                    <span className="text-xs text-muted-foreground font-mono w-12">
                      {dateLabel}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {item.type === "plan" ? "計画" : "案件"}
                    </span>
                    <span className="flex-1 text-sm text-foreground truncate">
                      {item.title}
                    </span>
                    <ApprovalStatusBadge status={item.status} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 1on1 Memo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-primary">
            1on1メモ
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="1on1で話したいこと、確認事項などをメモしてください..."
            className="w-full min-h-[120px] rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-y"
          />
          <p className="text-xs text-muted-foreground mt-1">
            メモはブラウザに自動保存されます
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
