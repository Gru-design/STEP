"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FunnelChart } from "@/components/deals/FunnelChart";
import { exportToCSV } from "@/lib/csv-export";
import {
  FileEdit,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import type { Role, User } from "@/types/database";

// ── Types ──

interface MemberStats {
  submittedToday: boolean;
  streak: number;
  level: number;
  xp: number;
  xpForNextLevel: number;
  weeklyKPIs: { label: string; value: string }[];
  recentBadges: { name: string; icon: string; earnedAt: string }[];
}

interface TeamMemberStatus {
  id: string;
  name: string;
  submitted: boolean;
}

interface WeeklyTrend {
  week: string;
  rate: number;
}

interface ManagerStats {
  todaySubmissionRate: number;
  weekSubmissionRate: number;
  teamMembers: TeamMemberStatus[];
  weeklyTrends: WeeklyTrend[];
  pendingNudges: number;
}

interface AdminStats {
  totalUsers: number;
  submissionRate: number;
  activeDeals: number;
  teamsOverview: { name: string; memberCount: number; submissionRate: number }[];
  deviationAlerts: { goalName: string; deviation: number; ownerName: string }[];
  funnelStages: { name: string; count: number }[];
}

interface ApprovalStats {
  pendingPlans: number;
  pendingDeals: number;
}

interface DashboardClientProps {
  user: User;
  role: Role;
  memberStats?: MemberStats;
  managerStats?: ManagerStats;
  adminStats?: AdminStats;
  approvalStats?: ApprovalStats;
}

// ── Level thresholds ──

const LEVEL_THRESHOLDS = [0, 100, 500, 1500, 5000];

function getXPProgress(xp: number, level: number): number {
  const current = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const next = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  if (next === current) return 100;
  return Math.min(100, Math.round(((xp - current) / (next - current)) * 100));
}

// ── Member Dashboard ──

function MemberDashboard({ stats }: { stats: MemberStats }) {
  const xpProgress = getXPProgress(stats.xp, stats.level);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Today's submission */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">本日の日報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${
                  stats.submittedToday ? "bg-success" : "bg-danger"
                }`}
              />
              <span className="text-base font-semibold text-foreground">
                {stats.submittedToday ? "提出済み" : "未提出"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Streak */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">連続提出</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-mono text-2xl font-bold text-primary">
              {stats.streak}
            </span>
            <span className="ml-1 text-sm text-muted-foreground">日</span>
          </CardContent>
        </Card>

        {/* Level + XP */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">レベル</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-primary">
                Lv.{stats.level}
              </span>
              <span className="text-xs text-muted-foreground">
                {stats.xp} / {stats.xpForNextLevel} XP
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-primary-muted">
              <div
                className="h-full rounded-full bg-accent-color transition-all"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* KPI Count */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">今週のKPI</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.weeklyKPIs.length > 0 ? (
              <div className="space-y-1">
                {stats.weeklyKPIs.slice(0, 3).map((kpi) => (
                  <div key={kpi.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{kpi.label}</span>
                    <span className="font-mono font-medium text-foreground">
                      {kpi.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">データなし</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Badges */}
      {stats.recentBadges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-primary">
              最近のバッジ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {stats.recentBadges.map((badge) => (
                <div
                  key={badge.name}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <span className="text-lg">{badge.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {badge.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(badge.earnedAt).toLocaleDateString("ja-JP")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Manager Dashboard ──

function ManagerDashboard({ stats }: { stats: ManagerStats }) {
  function handleExport() {
    const csvData = stats.teamMembers.map((m) => ({
      名前: m.name,
      提出状況: m.submitted ? "提出済み" : "未提出",
    }));
    exportToCSV(csvData, "team_submission_status.csv");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Today's rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              本日の提出率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-mono text-3xl font-bold text-primary">
              {stats.todaySubmissionRate}%
            </span>
          </CardContent>
        </Card>

        {/* Week rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              今週の提出率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-mono text-3xl font-bold text-primary">
              {stats.weekSubmissionRate}%
            </span>
          </CardContent>
        </Card>

        {/* Pending nudges */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              未対応ナッジ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span
              className={`font-mono text-3xl font-bold ${
                stats.pendingNudges > 0 ? "text-warning" : "text-success"
              }`}
            >
              {stats.pendingNudges}
            </span>
            <span className="ml-1 text-sm text-muted-foreground">件</span>
          </CardContent>
        </Card>
      </div>

      {/* Team members list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base text-primary">
            メンバー提出状況
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleExport}>
            CSVエクスポート
          </Button>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100">
            {stats.teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between py-2"
              >
                <span className="text-sm text-foreground">{member.name}</span>
                <Badge
                  variant={member.submitted ? "default" : "destructive"}
                  className={
                    member.submitted
                      ? "bg-emerald-50 text-success hover:bg-emerald-50"
                      : "bg-red-50 text-danger hover:bg-red-50"
                  }
                >
                  {member.submitted ? "提出済み" : "未提出"}
                </Badge>
              </div>
            ))}
            {stats.teamMembers.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                メンバーがいません
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weekly trend chart */}
      {stats.weeklyTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-primary">
              提出率推移（過去4週）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={stats.weeklyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12, fill: "#78716C" }}
                  axisLine={{ stroke: "#E7E5E4" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: "#78716C" }}
                  axisLine={{ stroke: "#E7E5E4" }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, "提出率"]}
                  contentStyle={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.5rem",
                    boxShadow: "none",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#0D9488"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#0D9488" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Admin Dashboard ──

function AdminDashboard({ stats }: { stats: AdminStats }) {
  function handleExport() {
    const csvData = stats.teamsOverview.map((t) => ({
      チーム名: t.name,
      メンバー数: t.memberCount,
      提出率: `${t.submissionRate}%`,
    }));
    exportToCSV(csvData, "teams_overview.csv");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              総ユーザー数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-mono text-3xl font-bold text-primary">
              {stats.totalUsers}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              全体提出率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-mono text-3xl font-bold text-primary">
              {stats.submissionRate}%
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              アクティブ案件
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-mono text-3xl font-bold text-accent-color">
              {stats.activeDeals}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              乖離アラート
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span
              className={`font-mono text-3xl font-bold ${
                stats.deviationAlerts.length > 0
                  ? "text-warning"
                  : "text-success"
              }`}
            >
              {stats.deviationAlerts.length}
            </span>
            <span className="ml-1 text-sm text-muted-foreground">件</span>
          </CardContent>
        </Card>
      </div>

      {/* Teams overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base text-primary">
            チーム概要
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleExport}>
            CSVエクスポート
          </Button>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100">
            {stats.teamsOverview.map((team) => (
              <div
                key={team.name}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <span className="text-sm font-medium text-foreground">
                    {team.name}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {team.memberCount}名
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-primary-muted">
                    <div
                      className="h-full rounded-full bg-accent-color"
                      style={{ width: `${team.submissionRate}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono text-sm text-foreground">
                    {team.submissionRate}%
                  </span>
                </div>
              </div>
            ))}
            {stats.teamsOverview.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                チームが登録されていません
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deviation Alerts */}
      {stats.deviationAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-warning">
              乖離アラート
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.deviationAlerts.map((alert, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/5 px-3 py-2"
                >
                  <div className="text-sm">
                    <span className="font-medium text-foreground">
                      {alert.goalName}
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      ({alert.ownerName})
                    </span>
                  </div>
                  <span className="font-mono text-sm font-semibold text-warning">
                    -{alert.deviation}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Funnel overview */}
      {stats.funnelStages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-primary">
              ファネル概要
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart stages={stats.funnelStages} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── CTA Banner ──

function ReportCTABanner({ submitted }: { submitted: boolean }) {
  if (submitted) return null;

  return (
    <Link
      href="/reports/new"
      className="group flex items-center justify-between rounded-xl border-2 border-dashed border-primary/30 bg-primary-light/40 px-5 py-4 transition-all hover:border-primary hover:bg-primary-light"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
          <FileEdit className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-primary">今日の日報を書く</p>
          <p className="text-xs text-muted-foreground">
            まだ今日の日報が提出されていません
          </p>
        </div>
      </div>
      <ArrowRight className="h-5 w-5 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

// ── Approval Section ──

function ApprovalSection({ stats }: { stats: ApprovalStats }) {
  const total = stats.pendingPlans + stats.pendingDeals;
  if (total === 0) return null;

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-warning">
          <CheckCircle2 className="h-5 w-5" />
          承認待ち
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
          {stats.pendingPlans > 0 && (
            <Link
              href="/plans?tab=approval"
              className="flex items-center justify-between rounded-lg border border-warning/20 bg-white px-4 py-2.5 transition-colors hover:bg-warning/5 sm:flex-1"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-foreground">
                  週次計画
                </span>
              </div>
              <Badge variant="outline" className="border-warning text-warning font-mono">
                {stats.pendingPlans}件
              </Badge>
            </Link>
          )}
          {stats.pendingDeals > 0 && (
            <Link
              href="/deals"
              className="flex items-center justify-between rounded-lg border border-warning/20 bg-white px-4 py-2.5 transition-colors hover:bg-warning/5 sm:flex-1"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-foreground">
                  案件判断
                </span>
              </div>
              <Badge variant="outline" className="border-warning text-warning font-mono">
                {stats.pendingDeals}件
              </Badge>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Component ──

export function DashboardClient({
  user,
  role,
  memberStats,
  managerStats,
  adminStats,
  approvalStats,
}: DashboardClientProps) {
  const roleLabels: Record<string, string> = {
    super_admin: "スーパーアドミン",
    admin: "管理者",
    manager: "マネージャー",
    member: "メンバー",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">ダッシュボード</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user.name}さん ({roleLabels[role]})
        </p>
      </div>

      {/* CTA: Write today's report */}
      {memberStats && <ReportCTABanner submitted={memberStats.submittedToday} />}

      {/* Approval section for managers */}
      {approvalStats &&
        (role === "manager" || role === "admin" || role === "super_admin") && (
          <ApprovalSection stats={approvalStats} />
        )}

      {/* Member view - always shown */}
      {memberStats && <MemberDashboard stats={memberStats} />}

      {/* Manager view */}
      {(role === "manager" || role === "admin" || role === "super_admin") &&
        managerStats && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-primary">
              チーム管理
            </h2>
            <ManagerDashboard stats={managerStats} />
          </div>
        )}

      {/* Admin view */}
      {(role === "admin" || role === "super_admin") && adminStats && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-primary">
            全体管理
          </h2>
          <AdminDashboard stats={adminStats} />
        </div>
      )}
    </div>
  );
}
