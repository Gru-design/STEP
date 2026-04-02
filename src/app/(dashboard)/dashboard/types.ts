import type { Role, User } from "@/types/database";

export interface PeerBonusStats {
  totalReceived: number;
  sentToday: boolean;
  recentReceived: { fromName: string; message: string; date: string }[];
}

export interface PendingReview {
  planId: string;
  weekStart: string;
  executionRate: number | null;
}

export interface GoalProgress {
  id: string;
  name: string;
  level: string;
  target: number;
  actual: number;
  rate: number;
  expectedRate: number;
  weeklyContribution: number | null;
  isOnTrack: boolean;
}

export interface MemberStats {
  submittedToday: boolean;
  streak: number;
  level: number;
  xp: number;
  xpForNextLevel: number;
  goalsProgress: GoalProgress[];
  recentBadges: { name: string; icon: string; earnedAt: string }[];
  pendingReview?: PendingReview | null;
  peerBonus?: PeerBonusStats;
  todayReceivedBonuses?: { fromName: string; message: string }[];
}

export interface TeamMemberStatus {
  id: string;
  name: string;
  submitted: boolean;
}

export interface WeeklyTrend {
  week: string;
  rate: number;
}

export interface ManagerStats {
  todaySubmissionRate: number;
  weekSubmissionRate: number;
  teamMembers: TeamMemberStatus[];
  weeklyTrends: WeeklyTrend[];
  pendingNudges: number;
}

export interface AdminStats {
  totalUsers: number;
  submissionRate: number;
  activeDeals: number;
  teamsOverview: { name: string; memberCount: number; submissionRate: number }[];
  deviationAlerts: { goalName: string; deviation: number; ownerName: string }[];
  funnelStages: { name: string; count: number }[];
}

export interface ApprovalStats {
  pendingPlans: number;
  pendingDeals: number;
}

export interface MemberDashboardProps {
  user: User;
  role: Role;
  memberStats: MemberStats;
}

export interface ManagerDashboardProps {
  user: User;
  role: Role;
  memberStats: MemberStats;
  managerStats: ManagerStats;
  approvalStats?: ApprovalStats;
}

export interface AdminDashboardProps {
  user: User;
  role: Role;
  memberStats: MemberStats;
  managerStats: ManagerStats;
  adminStats: AdminStats;
  approvalStats?: ApprovalStats;
}
