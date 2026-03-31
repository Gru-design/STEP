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
} from "lucide-react";
import type { ApprovalLog } from "@/types/database";
import { approvePlan, rejectPlan } from "@/app/(dashboard)/plans/actions";

interface ApprovalFlowProps {
  targetType: "weekly_plan" | "deal";
  targetId: string;
  currentStatus: string;
  isManager: boolean;
  logs: (ApprovalLog & { actor_name?: string })[];
}

const actionIcons: Record<string, React.ReactNode> = {
  submitted: <Send className="h-4 w-4 text-[#2563EB]" />,
  approved: <CheckCircle2 className="h-4 w-4 text-[#059669]" />,
  rejected: <XCircle className="h-4 w-4 text-[#DC2626]" />,
};

const actionLabels: Record<string, string> = {
  submitted: "提出",
  approved: "承認",
  rejected: "差し戻し",
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

    // Currently only weekly_plan approval is implemented via actions
    if (targetType === "weekly_plan") {
      const result = await approvePlan(targetId);
      if (!result.success) {
        setError(result.error ?? "承認に失敗しました");
      }
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

    if (targetType === "weekly_plan") {
      const result = await rejectPlan(targetId, rejectComment.trim());
      if (!result.success) {
        setError(result.error ?? "差し戻しに失敗しました");
      } else {
        setRejectComment("");
        setShowRejectForm(false);
      }
    }

    setProcessing(false);
  };

  return (
    <div className="space-y-4">
      {/* Status timeline */}
      <div className="space-y-1">
        <h4 className="text-sm font-medium text-[#1E293B]">承認フロー</h4>

        {/* Timeline steps */}
        <div className="relative ml-2 space-y-3 border-l-2 border-slate-200 pl-6 pt-2">
          {logs.map((log) => (
            <div key={log.id} className="relative">
              <div className="absolute -left-[31px] top-0.5 rounded-full bg-white p-0.5">
                {actionIcons[log.action] ?? (
                  <Clock className="h-4 w-4 text-[#64748B]" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#1E293B]">
                    {actionLabels[log.action] ?? log.action}
                  </span>
                  <span className="text-xs text-[#64748B]">
                    {log.actor_name ?? ""}
                  </span>
                  <span className="text-xs text-[#64748B]">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>
                {log.comment && (
                  <p className="mt-1 text-sm text-[#1E293B] rounded-md bg-[#F0F4FF] px-3 py-2">
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
                <Clock className="h-4 w-4 text-[#D97706]" />
              </div>
              <span className="text-sm text-[#D97706]">承認待ち</span>
            </div>
          )}
        </div>
      </div>

      {/* Manager actions */}
      {isManager && currentStatus === "submitted" && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-[#F0F4FF] p-4">
          <p className="text-sm font-medium text-[#0C025F]">
            承認アクション
          </p>

          {!showRejectForm ? (
            <div className="flex items-center gap-3">
              <Button
                onClick={handleApprove}
                disabled={processing}
                className="bg-[#059669] hover:bg-[#059669]/90 text-white"
              >
                <CheckCircle2 className="mr-1 h-4 w-4" />
                {processing ? "処理中..." : "承認"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRejectForm(true)}
                disabled={processing}
                className="border-[#DC2626] text-[#DC2626] hover:bg-red-50"
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
                className="border-slate-200"
              />
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleReject}
                  disabled={processing || !rejectComment.trim()}
                  className="bg-[#DC2626] hover:bg-[#DC2626]/90 text-white"
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
                  className="border-slate-200"
                >
                  キャンセル
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-[#DC2626]">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
