"use client";

import {
  GreetingHeader,
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
} from "./shared";
import type { ManagerDashboardProps } from "./types";

export function ManagerDashboard({
  user,
  role,
  memberStats,
  managerStats,
  approvalStats,
}: ManagerDashboardProps) {
  return (
    <div className="space-y-5 pb-4">
      <GreetingHeader user={user} stats={memberStats} />
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
    </div>
  );
}
