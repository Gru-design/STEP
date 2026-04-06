"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import type { ApprovalLog } from "@/types/database";
import { approvePlan, rejectPlan } from "@/app/(dashboard)/plans/actions";
import { approveDeal, rejectDeal } from "@/app/(dashboard)/deals/actions";

interface ApprovalFlowProps {
  targetType: "weekly_plan" | "deal";
  targetId: string;
  currentStatus: string;
  isManager: boolean;
  logs: (ApprovalLog & { actor_name?: string })[];
}

const actionIcons: Record<string, React.ReactNode> = {
  submitted: <Send className="h-4 w-4 text-accent-color" />,
  approved: <CheckCircle2 className="h-4 w-4 text-success" />,
  rejected: <XCircle className="h-4 w-4 text-danger" />,
  reopened: <RotateCcw className="h-4 w-4 text-warning" />,
};

const actionLabels: Record<string, string> = {
  submitted: "提出",
  approved: "承認",
  rejected: "差し戻し",
  reopened: "再編集",
};

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function ApprovalFlow({
  targetType,
  targetId,
  currentStatus,
  isManager,
  logs,
}: ApprovalFlowProps) {
  const [rejectComment, setRejectComment] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setProcessing(true);
    setError(null);

    const result = targetType === "weekly_plan"
      ? await approvePlan(targetId)
      : await approveDeal(targetId);
    if (!result.success) {
      setError(result.error ?? "承認に失敗しました");
    }

    setProcessing(false);
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) {
      setError("差し戻しコメントは必須です");
      return;
    }

    setProcessing(true);
    setError(null);

    const result = targetType === "weekly_plan"
      ? await rejectPlan(targetId, rejectComment.trim())
      : await rejectDeal(targetId, rejectComment.trim());
    if (!result.success) {
      setError(result.error ?? "差し戻しに失敗しました");
    } else {
      setRejectComment("");
      setShowRejectForm(false);
    }

    setProcessing(false);
  };

  return (
    <div className="space-y-4">
      {/* Status timeline */}
      <div className="space-y-1">
        <h4 className="text-sm font-medium text-foreground">承認フロー</h4>

        {/* Timeline steps */}
        <div className="relative ml-2 space-y-3 border-l-2 border-border pl-6 pt-2">
          {logs.map((log) => (
            <div key={log.id} className="relative">
              <div className="absolute -left-[31px] top-0.5 rounded-full bg-white p-0.5">
                {actionIcons[log.action] ?? (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {actionLabels[log.action] ?? log.action}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {log.actor_name ?? ""}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>
                {log.comment && (
                  <p className="mt-1 text-sm text-foreground rounded-md bg-muted px-3 py-2">
                    {log.comment}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Pending indicator */}
          {currentStatus === "submitted" && (
            <div className="relative">
              <div className="absolute -left-[31px] top-0.5 rounded-full bg-white p-0.5">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <span className="text-sm text-warning">承認待ち</span>
            </div>
          )}
        </div>
      </div>

      {/* Manager actions */}
      {isManager && currentStatus === "submitted" && (
        <div className="space-y-3 rounded-lg border border-border bg-muted p-4">
          <p className="text-sm font-medium text-primary">
            承認アクション
          </p>

          {!showRejectForm ? (
            <div className="flex items-center gap-3">
              <Button
                onClick={handleApprove}
                disabled={processing}
                className="bg-success hover:bg-success/90 text-white"
              >
                <CheckCircle2 className="mr-1 h-4 w-4" />
                {processing ? "処理中..." : "承認"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRejectForm(true)}
                disabled={processing}
                className="border-danger text-danger hover:bg-red-50"
              >
                <XCircle className="mr-1 h-4 w-4" />
                差し戻し
              </Button>
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
                  onClick={handleReject}
                  disabled={processing || !rejectComment.trim()}
                  className="bg-danger hover:bg-danger/90 text-white"
                >
                  {processing ? "処理中..." : "差し戻す"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectComment("");
                  }}
                  disabled={processing}
                  className="border-border"
                >
                  キャンセル
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-danger">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
