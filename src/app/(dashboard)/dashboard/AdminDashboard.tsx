"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LazyFunnelChart } from "@/components/shared/LazyCharts";
import { exportToCSV } from "@/lib/csv-export";
import {
  CheckCircle2,
  AlertTriangle,
  Users,
  Target,
  Briefcase,
} from "lucide-react";
import {
  GreetingHeader,
  NewPeerBonusBanner,
  ReportCTABanner,
  PendingReviewBanner,
  ApprovalSection,
  QuickActions,
  TeamSubmissionProgress,
  MemberStatsCards,
  GoalsProgressCard,
  PeerBonusCard,
  RecentBadges,
  WeeklyTrendChart,
  StatCard,
  TeamsOverview,
  DeviationAlerts,
} from "./shared";
import type { AdminDashboardProps } from "./types";

export function AdminDashboard({
  user,
  role,
  memberStats,
  managerStats,
  adminStats,
  approvalStats,
}: AdminDashboardProps) {
  return (
    <div className="space-y-5 pb-4">
      <GreetingHeader user={user} stats={memberStats} />
      <NewPeerBonusBanner bonuses={memberStats.todayReceivedBonuses ?? []} />
      <ReportCTABanner submitted={memberStats.submittedToday} />

      {memberStats.pendingReview && (
        <PendingReviewBanner review={memberStats.pendingReview} />
      )}

      {approvalStats && <ApprovalSection stats={approvalStats} />}

      <QuickActions role={role} />

      <TeamSubmissionProgress
        members={managerStats.teamMembers}
        rate={managerStats.todaySubmissionRate}
      />

      <MemberStatsCards stats={memberStats} />
      <GoalsProgressCard goals={memberStats.goalsProgress} />

      {memberStats.peerBonus && (
        <PeerBonusCard bonus={memberStats.peerBonus} />
      )}

      <RecentBadges badges={memberStats.recentBadges} />
      <WeeklyTrendChart trends={managerStats.weeklyTrends} />

      {/* Admin-only section */}
      <div className="pt-2">
        <h2 className="text-base font-bold text-foreground mb-3">
          全体管理
        </h2>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="総ユーザー"
            value={adminStats.totalUsers}
            unit="名"
            icon={Users}
            color="primary"
          />
          <StatCard
            label="全体提出率"
            value={adminStats.submissionRate}
            unit="%"
            icon={CheckCircle2}
            color={adminStats.submissionRate >= 80 ? "success" : adminStats.submissionRate >= 50 ? "warning" : "danger"}
          />
          <StatCard
            label="アクティブ案件"
            value={adminStats.activeDeals}
            unit="件"
            icon={Briefcase}
            color="accent"
            href="/deals"
          />
          <StatCard
            label="乖離アラート"
            value={adminStats.deviationAlerts.length}
            unit="件"
            icon={AlertTriangle}
            color={adminStats.deviationAlerts.length > 0 ? "warning" : "success"}
          />
        </div>
      </div>

      <TeamsOverview
        teams={adminStats.teamsOverview}
        onExport={() => {
          exportToCSV(
            adminStats.teamsOverview.map((t) => ({
              チーム名: t.name,
              メンバー数: t.memberCount,
              提出率: `${t.submissionRate}%`,
            })),
            "teams_overview.csv"
          );
        }}
      />

      <DeviationAlerts alerts={adminStats.deviationAlerts} />

      {adminStats.funnelStages.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              ファネル概要
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LazyFunnelChart stages={adminStats.funnelStages} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
