"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LazyFunnelChart, LazySubmissionTrendChart } from "@/components/shared/LazyCharts";
import { exportToCSV } from "@/lib/csv-export";
import {
  FileEdit,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Flame,
  Trophy,
  TrendingUp,
  Users,
  Target,
  Briefcase,
  Clock,
  ChevronRight,
  Zap,
  Star,
  Heart,
  Gift,
  ClipboardCheck,
} from "lucide-react";
import type { Role, User } from "@/types/database";
import type {
  MemberStats,
  PendingReview,
  ApprovalStats,
  TeamMemberStatus,
  WeeklyTrend,
  GoalProgress,
  PeerBonusStats,
} from "./types";

// -- Level thresholds --

const LEVEL_THRESHOLDS = [0, 100, 500, 1500, 5000];

function getXPProgress(xp: number, level: number): number {
  const current = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const next = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  if (next === current) return 100;
  return Math.min(100, Math.round(((xp - current) / (next - current)) * 100));
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "おはようございます";
  if (hour < 17) return "お疲れさまです";
  return "お疲れさまです";
}

// -- Greeting Header with Gamification --

export function GreetingHeader({
  user,
  stats,
}: {
  user: User;
  stats: MemberStats;
}) {
  const xpProgress = getXPProgress(stats.xp, stats.level);

  return (
    <div className="rounded-xl bg-gradient-to-r from-primary/5 via-primary/3 to-transparent p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            {getGreeting()}、{user.name}さん
          </h1>
          {stats.streak > 0 && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-sm font-medium text-orange-600 border border-orange-200">
                <Flame className="h-3.5 w-3.5" />
                {stats.streak}日連続提出中
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-white/80 px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-accent-color" />
            <span className="font-mono text-sm font-bold text-foreground">
              Lv.{stats.level}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-20 overflow-hidden rounded-full bg-primary-muted sm:w-28">
              <div
                className="h-full rounded-full bg-accent-color motion-safe:transition-all duration-500"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
              {stats.xp}/{stats.xpForNextLevel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Report CTA Banner --

export function ReportCTABanner({ submitted }: { submitted: boolean }) {
  if (submitted) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success/5 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-5 w-5 text-success" />
        </div>
        <div>
          <p className="font-semibold text-success">本日の日報は提出済みです</p>
          <p className="text-xs text-muted-foreground">
            お疲れさまでした！
          </p>
        </div>
      </div>
    );
  }

  return (
    <Link
      href="/reports/new"
      className="group flex items-center justify-between rounded-xl border-2 border-primary/20 bg-gradient-to-r from-primary/8 to-primary/3 px-5 py-5 motion-safe:transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
          <FileEdit className="h-6 w-6" />
        </div>
        <div>
          <p className="text-base font-bold text-primary">今日の日報を書く</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            タップして入力を開始
          </p>
        </div>
      </div>
      <ArrowRight className="h-5 w-5 text-primary motion-safe:transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

// -- Pending Review Banner --

export function PendingReviewBanner({ review }: { review: PendingReview }) {
  const weekEnd = new Date(review.weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const range = `${new Date(review.weekStart).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}`;

  return (
    <Link
      href="/plans"
      className="group flex items-center justify-between rounded-xl border-2 border-amber-200 bg-amber-50/50 px-5 py-4 motion-safe:transition-all hover:border-amber-300 hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <ClipboardCheck className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">
            先週の振り返りをしましょう
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {range}
            {review.executionRate !== null && (
              <span className="ml-2 font-mono">
                実行率 {Math.round(review.executionRate)}%
              </span>
            )}
          </p>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-amber-500 motion-safe:transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

// -- Stat Card --

export function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  color = "primary",
  href,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: "primary" | "accent" | "success" | "warning" | "danger";
  href?: string;
}) {
  const colorMap = {
    primary: "text-primary bg-primary/8",
    accent: "text-accent-color bg-accent-color/8",
    success: "text-success bg-success/8",
    warning: "text-warning bg-warning/8",
    danger: "text-danger bg-danger/8",
  };
  const textColorMap = {
    primary: "text-primary",
    accent: "text-accent-color",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  };

  const content = (
    <Card className="motion-safe:transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className={`font-mono text-2xl font-bold ${textColorMap[color]}`}>
                {value}
              </span>
              {unit && (
                <span className="text-sm text-muted-foreground">{unit}</span>
              )}
            </div>
          </div>
          <div className={`rounded-lg p-2 ${colorMap[color]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// -- Goals Progress --

export function GoalsProgressCard({ goals }: { goals: GoalProgress[] }) {
  if (goals.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />
            目標進捗
          </CardTitle>
          <Link
            href="/goals"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary motion-safe:transition-colors"
          >
            すべて見る
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map((goal) => {
          const barColor = goal.rate >= 100
            ? "var(--color-success)"
            : goal.isOnTrack
            ? "var(--color-primary)"
            : "var(--color-warning)";

          return (
            <div key={goal.id} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {goal.level}
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">
                      {goal.name}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-mono text-sm font-bold" style={{ color: barColor }}>
                    {goal.rate}%
                  </span>
                </div>
              </div>

              {/* Progress bar with expected marker */}
              <div className="relative">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full motion-safe:transition-all duration-500"
                    style={{ width: `${Math.min(100, goal.rate)}%`, background: barColor }}
                  />
                </div>
                {goal.expectedRate > 0 && goal.expectedRate < 100 && (
                  <div
                    className="absolute top-0 h-2.5 w-0.5 bg-foreground/30"
                    style={{ left: `${goal.expectedRate}%` }}
                    title={`期待進捗: ${goal.expectedRate}%`}
                  />
                )}
              </div>

              {/* Detail row */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono">
                  {goal.actual.toLocaleString()} / {goal.target.toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  {goal.weeklyContribution !== null && goal.weeklyContribution > 0 && (
                    <span className="flex items-center gap-0.5 text-primary">
                      <TrendingUp className="h-3 w-3" />
                      今週 +{goal.weeklyContribution.toLocaleString()}
                    </span>
                  )}
                  {!goal.isOnTrack && (
                    <span className="flex items-center gap-0.5 text-warning">
                      <AlertTriangle className="h-3 w-3" />
                      遅れ
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// -- Recent Badges --

export function RecentBadges({
  badges,
}: {
  badges: { name: string; icon: string; earnedAt: string }[];
}) {
  if (badges.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-accent-color" />
            最近のバッジ
          </CardTitle>
          <Link
            href="/badges"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary motion-safe:transition-colors"
          >
            すべて見る
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          {badges.map((badge) => (
            <div
              key={badge.name}
              className="flex shrink-0 flex-col items-center gap-1.5 rounded-xl border border-border bg-muted/20 px-4 py-3 min-w-[80px]"
            >
              <span className="text-2xl">{badge.icon}</span>
              <span className="text-xs font-medium text-foreground text-center leading-tight">
                {badge.name}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// -- Peer Bonus Card --

export function PeerBonusCard({ bonus }: { bonus: PeerBonusStats }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-accent-color" />
            もらったピアボーナス
          </CardTitle>
          <span className="flex items-center gap-1 rounded-full bg-accent-color/10 px-2.5 py-0.5 text-xs font-bold text-accent-color">
            <Gift className="h-3 w-3" />
            {bonus.totalReceived}P
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {bonus.recentReceived.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-color/10 text-sm">
                <Heart className="h-3.5 w-3.5 text-accent-color" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {item.fromName}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(item.date).toLocaleDateString("ja-JP", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                  {item.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// -- Quick Actions --

export function QuickActions({ role }: { role: Role }) {
  const actions = [
    {
      label: "日報を書く",
      href: "/reports/new",
      icon: FileEdit,
      color: "bg-primary/8 text-primary",
      roles: ["member", "manager", "admin", "super_admin"],
    },
    {
      label: "日報フィード",
      href: "/reports",
      icon: Star,
      color: "bg-accent-color/8 text-accent-color",
      roles: ["member", "manager", "admin", "super_admin"],
    },
    {
      label: "目標",
      href: "/goals",
      icon: Target,
      color: "bg-success/8 text-success",
      roles: ["manager", "admin", "super_admin"],
    },
    {
      label: "案件",
      href: "/deals",
      icon: Briefcase,
      color: "bg-warning/8 text-warning",
      roles: ["member", "manager", "admin", "super_admin"],
    },
  ];

  const filtered = actions.filter((a) => a.roles.includes(role));

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {filtered.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-white p-3 text-center motion-safe:transition-all hover:shadow-md active:scale-[0.97]"
          >
            <div className={`rounded-lg p-2 ${action.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-foreground">
              {action.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// -- Member Stats Cards --

export function MemberStatsCards({ stats }: { stats: MemberStats }) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="連続提出"
        value={stats.streak}
        unit="日"
        icon={Flame}
        color={stats.streak >= 7 ? "accent" : "primary"}
      />
      <StatCard
        label="本日の日報"
        value={stats.submittedToday ? "完了" : "未提出"}
        icon={CheckCircle2}
        color={stats.submittedToday ? "success" : "danger"}
      />
      <StatCard
        label="レベル"
        value={`Lv.${stats.level}`}
        icon={Zap}
        color="accent"
      />
      <StatCard
        label="目標"
        value={stats.goalsProgress.length > 0
          ? `${stats.goalsProgress.filter((g) => g.isOnTrack).length}/${stats.goalsProgress.length}`
          : "-"}
        unit="順調"
        icon={Target}
        color={stats.goalsProgress.length > 0 && stats.goalsProgress.every((g) => g.isOnTrack) ? "success" : stats.goalsProgress.some((g) => !g.isOnTrack) ? "warning" : "primary"}
        href="/goals"
      />
    </div>
  );
}

// -- Approval Section --

export function ApprovalSection({ stats }: { stats: ApprovalStats }) {
  const total = stats.pendingPlans + stats.pendingDeals;
  if (total === 0) return null;

  return (
    <Card className="border-warning/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10">
            <Clock className="h-5 w-5 text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              承認待ち {total}件
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.pendingPlans > 0 && `週次計画 ${stats.pendingPlans}件`}
              {stats.pendingPlans > 0 && stats.pendingDeals > 0 && " / "}
              {stats.pendingDeals > 0 && `案件 ${stats.pendingDeals}件`}
            </p>
          </div>
          <Link
            href="/plans?tab=approval"
            className="shrink-0"
          >
            <Button size="sm" variant="outline" className="border-warning/30 text-warning hover:bg-warning/5">
              確認する
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// -- Team Submission Progress --

export function TeamSubmissionProgress({
  members,
  rate,
}: {
  members: TeamMemberStatus[];
  rate: number;
}) {
  const submitted = members.filter((m) => m.submitted);
  const notSubmitted = members.filter((m) => !m.submitted);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            チーム提出状況
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xl font-bold text-primary">
              {rate}%
            </span>
            <span className="text-xs text-muted-foreground">
              ({submitted.length}/{members.length})
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full motion-safe:transition-all duration-700"
            style={{
              width: `${rate}%`,
              background:
                rate >= 80
                  ? "var(--color-success)"
                  : rate >= 50
                  ? "var(--color-warning)"
                  : "var(--color-danger)",
            }}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {members.map((m) => (
            <div
              key={m.id}
              title={`${m.name}: ${m.submitted ? "提出済み" : "未提出"}`}
              className={`h-3 w-3 rounded-full motion-safe:transition-colors ${
                m.submitted ? "bg-success" : "bg-danger/30"
              }`}
            />
          ))}
        </div>

        {notSubmitted.length > 0 && (
          <div className="rounded-lg border border-danger/10 bg-danger/3 p-3">
            <p className="mb-2 text-xs font-medium text-danger">
              未提出 ({notSubmitted.length}名)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {notSubmitted.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center rounded-md border border-danger/15 bg-white px-2 py-0.5 text-xs text-foreground"
                >
                  {m.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// -- Weekly Trend Chart --

export function WeeklyTrendChart({ trends }: { trends: WeeklyTrend[] }) {
  if (trends.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-primary" />
          提出率推移（過去4週）
        </CardTitle>
      </CardHeader>
      <CardContent>
        <LazySubmissionTrendChart data={trends} />
      </CardContent>
    </Card>
  );
}

// -- Admin Teams Overview --

export function TeamsOverview({
  teams,
  onExport,
}: {
  teams: { name: string; memberCount: number; submissionRate: number }[];
  onExport: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            チーム概要
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onExport} className="text-xs text-muted-foreground">
            CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {teams.map((team) => (
            <div
              key={team.name}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div>
                <span className="text-sm font-medium text-foreground">
                  {team.name}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {team.memberCount}名
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-20 overflow-hidden rounded-full bg-muted sm:w-28">
                  <div
                    className="h-full rounded-full motion-safe:transition-all duration-500"
                    style={{
                      width: `${team.submissionRate}%`,
                      background:
                        team.submissionRate >= 80
                          ? "var(--color-success)"
                          : team.submissionRate >= 50
                          ? "var(--color-warning)"
                          : "var(--color-danger)",
                    }}
                  />
                </div>
                <span className="w-10 text-right font-mono text-sm font-semibold text-foreground">
                  {team.submissionRate}%
                </span>
              </div>
            </div>
          ))}
          {teams.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              チームが登録されていません
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// -- Deviation Alerts --

export function DeviationAlerts({
  alerts,
}: {
  alerts: { goalName: string; deviation: number; ownerName: string }[];
}) {
  if (alerts.length === 0) return null;

  return (
    <Card className="border-warning/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-warning">
          <AlertTriangle className="h-4 w-4" />
          目標乖離アラート ({alerts.length}件)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-warning/15 bg-warning/3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {alert.goalName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {alert.ownerName}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 border-warning/30 text-warning font-mono">
                -{alert.deviation}%
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
