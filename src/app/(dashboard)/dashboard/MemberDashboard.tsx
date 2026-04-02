"use client";

import {
  GreetingHeader,
  ReportCTABanner,
  PendingReviewBanner,
  QuickActions,
  MemberStatsCards,
  GoalsProgressCard,
  PeerBonusCard,
  RecentBadges,
} from "./shared";
import type { MemberDashboardProps } from "./types";

export function MemberDashboard({ user, role, memberStats }: MemberDashboardProps) {
  return (
    <div className="space-y-5 pb-4">
      <GreetingHeader user={user} stats={memberStats} />
      <ReportCTABanner submitted={memberStats.submittedToday} />

      {memberStats.pendingReview && (
        <PendingReviewBanner review={memberStats.pendingReview} />
      )}

      <QuickActions role={role} />
      <MemberStatsCards stats={memberStats} />
      <GoalsProgressCard goals={memberStats.goalsProgress} />

      {memberStats.peerBonus && (
        <PeerBonusCard bonus={memberStats.peerBonus} />
      )}

      <RecentBadges badges={memberStats.recentBadges} />
    </div>
  );
}
