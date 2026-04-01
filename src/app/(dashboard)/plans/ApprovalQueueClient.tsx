"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DynamicForm } from "@/components/reports/DynamicForm";
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ChevronRight,
  AlertCircle,
  Inbox,
} from "lucide-react";
import type {
  ReportTemplate,
  ApprovalLog,
  TemplateSchema,
} from "@/types/database";
import type { PlanWithUser } from "./page";
import { approvePlan, rejectPlan } from "./actions";

interface ApprovalQueueClientProps {
  pendingPlans: PlanWithUser[];
  templates: ReportTemplate[];
  approvalLogs: (ApprovalLog & { actor_name?: string })[];
}

function formatDateJP(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${formatDateJP(weekStart)} - ${formatDateJP(end.toISOString())}`;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function ApprovalQueueClient({
  pendingPlans,
  templates,
  approvalLogs,
}: ApprovalQueueClientProps) {
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(
    pendingPlans.length === 1 ? pendingPlans[0].id : null
  );
  const [rejectingPlanId, setRejectingPlanId] = useState<string | null>(null);
  const [approvingPlanId, setApprovingPlanId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [approveComment, setApproveComment] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const logsByPlan = useMemo(() => {
    const map: Record<string, (ApprovalLog & { actor_name?: string })[]> = {};
    for (const log of approvalLogs) {
      if (!map[log.target_id]) map[log.target_id] = [];
      map[log.target_id].push(log);
    }
    return map;
  }, [approvalLogs]);

  const handleApprove = async (planId: string) => {
    setProcessing(planId);
    setError(null);
    setSuccessMsg(null);

    const result = await approvePlan(planId, approveComment.trim() || undefined);
    setProcessing(null);

    if (result.success) {
      setApprovingPlanId(null);
      setApproveComment("");
      setSuccessMsg("承認しました");
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setError(result.error ?? "承認に失敗しました");
    }
  };

  const handleReject = async (planId: string) => {
    if (!rejectComment.trim()) {
      setError("差し戻しコメントは必須です");
      return;
    }

    setProcessing(planId);
    setError(null);
    setSuccessMsg(null);

    const result = await rejectPlan(planId, rejectComment.trim());
    setProcessing(null);

    if (result.success) {
      setRejectingPlanId(null);
      setRejectComment("");
      setSuccessMsg("差し戻しました");
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setError(result.error ?? "差し戻しに失敗しました");
    }
  };

  if (pendingPlans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white py-16">
        <Inbox className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-lg font-medium text-foreground">
          承認待ちの計画はありません
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          メンバーが週次計画を提出すると、ここに表示されます
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Messages */}
      {successMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="mr-2 inline h-4 w-4" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
          <AlertCircle className="mr-2 inline h-4 w-4" />
          {error}
        </div>
      )}

      {pendingPlans.map((plan) => {
        const isExpanded = expandedPlanId === plan.id;
        const isRejecting = rejectingPlanId === plan.id;
        const isApproving = approvingPlanId === plan.id;
        const isProcessing = processing === plan.id;
        const planTemplate = templates.find((t) => t.id === plan.template_id);
        const planLogs = logsByPlan[plan.id] ?? [];

        return (
          <div
            key={plan.id}
            className="rounded-xl border border-border bg-white shadow-sm"
          >
            {/* Header */}
            <button
              onClick={() =>
                setExpandedPlanId(isExpanded ? null : plan.id)
              }
              className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-muted/50 transition-colors rounded-t-xl"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {plan.user_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatWeekRange(plan.week_start)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  <Clock className="h-3 w-3" />
                  承認待ち
                </span>
                <ChevronRight
                  className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
                />
              </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-border p-6 space-y-6">
                {/* Plan content */}
                {planTemplate ? (
                  <DynamicForm
                    schema={planTemplate.schema as TemplateSchema}
                    values={
                      (plan.items as Record<string, unknown>) ?? {}
                    }
                    onChange={() => {}}
                    readOnly
                  />
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted p-4">
                    <p className="text-sm text-muted-foreground">
                      テンプレートが見つかりません
                    </p>
                    {plan.items && (
                      <pre className="mt-2 text-xs text-muted-foreground overflow-auto">
                        {JSON.stringify(plan.items, null, 2)}
                      </pre>
                    )}
                  </div>
                )}

                {/* Approval timeline */}
                {planLogs.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-foreground">
                      承認フロー
                    </h4>
                    <div className="relative ml-2 space-y-3 border-l-2 border-border pl-6 pt-2">
                      {planLogs.map((log) => (
                        <div key={log.id} className="relative">
                          <div className="absolute -left-[31px] top-0.5 rounded-full bg-white p-0.5">
                            {log.action === "submitted" ? (
                              <Clock className="h-4 w-4 text-accent-color" />
                            ) : log.action === "approved" ? (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            ) : (
                              <XCircle className="h-4 w-4 text-danger" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {log.action === "submitted"
                                ? "提出"
                                : log.action === "approved"
                                  ? "承認"
                                  : "差し戻し"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {log.actor_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(log.created_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Approval actions */}
                <div className="space-y-3 rounded-lg border border-border bg-muted p-4">
                  <p className="text-sm font-medium text-primary">
                    承認アクション
                  </p>

                  {!isRejecting && !isApproving ? (
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() => {
                          setApprovingPlanId(plan.id);
                          setRejectingPlanId(null);
                          setError(null);
                        }}
                        disabled={isProcessing}
                        className="bg-success hover:bg-success/90 text-white"
                      >
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        承認
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setRejectingPlanId(plan.id);
                          setApprovingPlanId(null);
                          setError(null);
                        }}
                        disabled={isProcessing}
                        className="border-danger text-danger hover:bg-red-50"
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        差し戻し
                      </Button>
                    </div>
                  ) : isApproving ? (
                    <div className="space-y-3">
                      <Textarea
                        value={approveComment}
                        onChange={(e) => setApproveComment(e.target.value)}
                        placeholder="承認コメント（任意）"
                        rows={2}
                        className="border-border"
                      />
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() => handleApprove(plan.id)}
                          disabled={isProcessing}
                          className="bg-success hover:bg-success/90 text-white"
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          {isProcessing ? "処理中..." : "承認する"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setApprovingPlanId(null);
                            setApproveComment("");
                            setError(null);
                          }}
                          disabled={isProcessing}
                          className="border-border"
                        >
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Textarea
                        value={rejectComment}
                        onChange={(e) => setRejectComment(e.target.value)}
                        placeholder="差し戻し理由を入力してください（必須）"
                        rows={3}
                        className="border-border"
                      />
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() => handleReject(plan.id)}
                          disabled={
                            isProcessing || !rejectComment.trim()
                          }
                          className="bg-danger hover:bg-danger/90 text-white"
                        >
                          {isProcessing ? "処理中..." : "差し戻す"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setRejectingPlanId(null);
                            setRejectComment("");
                            setError(null);
                          }}
                          disabled={isProcessing}
                          className="border-border"
                        >
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
