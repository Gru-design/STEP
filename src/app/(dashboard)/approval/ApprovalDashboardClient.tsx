"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardList,
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { approvePlan, rejectPlan } from "@/app/(dashboard)/plans/actions";
import { approveDeal, rejectDeal } from "@/app/(dashboard)/deals/actions";

interface PendingPlan {
  id: string;
  user_id: string;
  week_start: string;
  items: unknown;
  status: string;
  created_at: string;
  template_id: string | null;
}

interface PendingDeal {
  id: string;
  user_id: string;
  company: string;
  title: string | null;
  value: number | null;
  stage_id: string;
  approval_status: string;
  created_at: string;
}

interface LogEntry {
  id: string;
  target_type: string;
  target_id: string;
  action: string;
  actor_id: string;
  actor_name: string;
  comment: string | null;
  created_at: string;
}

interface ApprovalDashboardClientProps {
  pendingPlans: PendingPlan[];
  pendingDeals: PendingDeal[];
  recentLogs: LogEntry[];
  userMap: Record<string, string>;
  stageMap: Record<string, string>;
  currentUserId: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
}

const actionIcons: Record<string, React.ReactNode> = {
  submitted: <Send className="h-3.5 w-3.5 text-accent-color" />,
  approved: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
  rejected: <XCircle className="h-3.5 w-3.5 text-danger" />,
};

const actionLabels: Record<string, string> = {
  submitted: "提出",
  approved: "承認",
  rejected: "差し戻し",
};

export function ApprovalDashboardClient({
  pendingPlans,
  pendingDeals,
  recentLogs,
  userMap,
  stageMap,
  currentUserId,
}: ApprovalDashboardClientProps) {
  const totalPending = pendingPlans.length + pendingDeals.length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-warning/10 p-2">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono text-foreground">{totalPending}</p>
                <p className="text-xs text-muted-foreground">承認待ち合計</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono text-foreground">{pendingPlans.length}</p>
                <p className="text-xs text-muted-foreground">週次計画</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-accent-color/10 p-2">
                <Briefcase className="h-5 w-5 text-accent-color" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono text-foreground">{pendingDeals.length}</p>
                <p className="text-xs text-muted-foreground">案件承認</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Plans */}
      {pendingPlans.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-primary" />
              週次計画の承認待ち
              <Badge variant="outline" className="ml-1 font-mono">{pendingPlans.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingPlans.map((plan) => (
              <ApprovalPlanCard
                key={plan.id}
                plan={plan}
                userName={userMap[plan.user_id] ?? "不明"}
                currentUserId={currentUserId}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pending Deals */}
      {pendingDeals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4 text-accent-color" />
              案件の承認待ち
              <Badge variant="outline" className="ml-1 font-mono">{pendingDeals.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingDeals.map((deal) => (
              <ApprovalDealCard
                key={deal.id}
                deal={deal}
                userName={userMap[deal.user_id] ?? "不明"}
                stageName={stageMap[deal.stage_id] ?? "不明"}
                currentUserId={currentUserId}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {totalPending === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success/30" />
              <p className="text-sm font-medium text-foreground">承認待ちはありません</p>
              <p className="mt-1 text-xs text-muted-foreground">すべての承認が完了しています</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent activity */}
      {recentLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-muted-foreground">最近の承認アクティビティ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  {actionIcons[log.action] ?? <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="font-medium text-foreground truncate max-w-[120px]">{log.actor_name}</span>
                  <span className="text-muted-foreground">が</span>
                  <span className="text-muted-foreground">
                    {log.target_type === "weekly_plan" ? "週次計画" : "案件"}を
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      log.action === "approved" ? "border-success/30 text-success" :
                      log.action === "rejected" ? "border-danger/30 text-danger" :
                      "border-border"
                    }
                  >
                    {actionLabels[log.action] ?? log.action}
                  </Badge>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {formatDate(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Plan approval card ──

function ApprovalPlanCard({
  plan,
  userName,
  currentUserId,
}: {
  plan: PendingPlan;
  userName: string;
  currentUserId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [rejectComment, setRejectComment] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isSelf = plan.user_id === currentUserId;

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approvePlan(plan.id);
      if (result.success) setDone(true);
      else setError(result.error ?? "承認に失敗しました");
    });
  };

  const handleReject = () => {
    if (!rejectComment.trim()) { setError("コメントは必須です"); return; }
    startTransition(async () => {
      const result = await rejectPlan(plan.id, rejectComment.trim());
      if (result.success) setDone(true);
      else setError(result.error ?? "差し戻しに失敗しました");
    });
  };

  if (done) {
    return (
      <div className="rounded-lg border border-success/20 bg-success/5 p-4 text-sm text-success">
        処理が完了しました
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">{userName}</p>
            <p className="text-xs text-muted-foreground">{formatWeekRange(plan.week_start)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {!isSelf && (
            <>
              <Button size="sm" onClick={handleApprove} disabled={isPending}
                className="bg-success hover:bg-success/90 text-white h-8">
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />承認
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowReject(!showReject)}
                disabled={isPending}
                className="border-danger text-danger hover:bg-red-50 h-8">
                <XCircle className="mr-1 h-3.5 w-3.5" />差し戻し
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)} className="h-8 w-8 p-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {showReject && (
        <div className="space-y-2">
          <Textarea value={rejectComment} onChange={(e) => setRejectComment(e.target.value)}
            placeholder="差し戻し理由（必須）" rows={2} className="border-border text-sm" />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleReject} disabled={isPending || !rejectComment.trim()}
              className="bg-danger hover:bg-danger/90 text-white">差し戻す</Button>
            <Button size="sm" variant="outline" onClick={() => { setShowReject(false); setRejectComment(""); }}>
              キャンセル
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-danger">
          <AlertCircle className="h-3.5 w-3.5" />{error}
        </div>
      )}

      {expanded && plan.items != null && (
        <div className="rounded-lg bg-muted/50 p-3 text-xs">
          <pre className="whitespace-pre-wrap text-foreground">
            {JSON.stringify(plan.items as Record<string, unknown>, null, 2)}
          </pre>
        </div>
      )}

      {isSelf && (
        <p className="text-xs text-muted-foreground">自分の計画のため承認操作はできません</p>
      )}
    </div>
  );
}

// ── Deal approval card ──

function ApprovalDealCard({
  deal,
  userName,
  stageName,
  currentUserId,
}: {
  deal: PendingDeal;
  userName: string;
  stageName: string;
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [rejectComment, setRejectComment] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isSelf = deal.user_id === currentUserId;

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveDeal(deal.id);
      if (result.success) setDone(true);
      else setError(result.error ?? "承認に失敗しました");
    });
  };

  const handleReject = () => {
    if (!rejectComment.trim()) { setError("コメントは必須です"); return; }
    startTransition(async () => {
      const result = await rejectDeal(deal.id, rejectComment.trim());
      if (result.success) setDone(true);
      else setError(result.error ?? "差し戻しに失敗しました");
    });
  };

  if (done) {
    return (
      <div className="rounded-lg border border-success/20 bg-success/5 p-4 text-sm text-success">
        処理が完了しました
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{deal.company}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {deal.title && <span className="text-xs text-muted-foreground">{deal.title}</span>}
            <Badge variant="outline" className="text-[10px]">{stageName}</Badge>
            {deal.value != null && (
              <span className="text-xs font-mono text-muted-foreground">
                ¥{Number(deal.value).toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">担当: {userName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {!isSelf && (
            <>
              <Button size="sm" onClick={handleApprove} disabled={isPending}
                className="bg-success hover:bg-success/90 text-white h-8">
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />承認
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowReject(!showReject)}
                disabled={isPending}
                className="border-danger text-danger hover:bg-red-50 h-8">
                <XCircle className="mr-1 h-3.5 w-3.5" />差し戻し
              </Button>
            </>
          )}
        </div>
      </div>

      {showReject && (
        <div className="space-y-2">
          <Textarea value={rejectComment} onChange={(e) => setRejectComment(e.target.value)}
            placeholder="差し戻し理由（必須）" rows={2} className="border-border text-sm" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleReject} disabled={isPending || !rejectComment.trim()}
              className="bg-danger hover:bg-danger/90 text-white">差し戻す</Button>
            <Button size="sm" variant="outline" onClick={() => { setShowReject(false); setRejectComment(""); }}>
              キャンセル
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-danger">
          <AlertCircle className="h-3.5 w-3.5" />{error}
        </div>
      )}

      {isSelf && (
        <p className="text-xs text-muted-foreground">自分の案件のため承認操作はできません</p>
      )}
    </div>
  );
}
