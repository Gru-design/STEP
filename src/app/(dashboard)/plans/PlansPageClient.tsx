"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DynamicForm } from "@/components/reports/DynamicForm";
import { ApprovalFlow } from "@/components/shared/ApprovalFlow";
import { FileEdit, ChevronRight, Calendar, CheckCircle2 } from "lucide-react";
import type {
  WeeklyPlan,
  ReportTemplate,
  ApprovalLog,
  TemplateSchema,
} from "@/types/database";
import { createOrUpdatePlan, submitPlan } from "./actions";

interface PlansPageClientProps {
  plans: WeeklyPlan[];
  templates: ReportTemplate[];
  approvalLogs: (ApprovalLog & { actor_name?: string })[];
  isManager: boolean;
  userId: string;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
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

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  draft: { label: "下書き", bg: "bg-gray-100", text: "text-gray-700" },
  submitted: { label: "提出済", bg: "bg-blue-100", text: "text-blue-700" },
  approved: { label: "承認済", bg: "bg-green-100", text: "text-green-700" },
  rejected: { label: "差し戻し", bg: "bg-red-100", text: "text-red-700" },
};

export function PlansPageClient({
  plans,
  templates,
  approvalLogs,
  isManager: _isManager,
  userId: _userId,
}: PlansPageClientProps) {
  const currentMonday = getMonday(new Date()).toISOString().split("T")[0];
  const currentPlan = plans.find((p) => p.week_start === currentMonday);
  const pastPlans = plans.filter((p) => p.week_start !== currentMonday);

  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    currentPlan?.template_id ?? templates[0]?.id ?? ""
  );
  const [formValues, setFormValues] = useState<Record<string, unknown>>(
    (currentPlan?.items as Record<string, unknown>) ?? {}
  );
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  const activeTemplate = templates.find((t) => t.id === selectedTemplate);

  const currentPlanLogs = useMemo(
    () =>
      currentPlan
        ? approvalLogs.filter((l) => l.target_id === currentPlan.id)
        : [],
    [currentPlan, approvalLogs]
  );

  // Find rejection/approval comment
  const rejectionLog = currentPlanLogs.find((l) => l.action === "rejected");
  const approvalLog = currentPlanLogs.find((l) => l.action === "approved");

  const handleSaveDraft = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const result = await createOrUpdatePlan({
      weekStart: currentMonday,
      templateId: selectedTemplate,
      items: formValues,
      status: "draft",
    });

    setSaving(false);
    if (result.success) {
      setSuccessMsg("下書きを保存しました");
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setError(result.error ?? "保存に失敗しました");
    }
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    if (currentPlan && currentPlan.status === "draft") {
      // First save, then submit
      const saveResult = await createOrUpdatePlan({
        weekStart: currentMonday,
        templateId: selectedTemplate,
        items: formValues,
        status: "submitted",
      });

      setSubmitting(false);
      if (saveResult.success) {
        setSuccessMsg("週次計画を提出しました");
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(saveResult.error ?? "提出に失敗しました");
      }
    } else if (currentPlan) {
      const result = await submitPlan(currentPlan.id);
      setSubmitting(false);
      if (result.success) {
        setSuccessMsg("週次計画を提出しました");
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(result.error ?? "提出に失敗しました");
      }
    } else {
      // No plan yet, create and submit
      const result = await createOrUpdatePlan({
        weekStart: currentMonday,
        templateId: selectedTemplate,
        items: formValues,
        status: "submitted",
      });

      setSubmitting(false);
      if (result.success) {
        setSuccessMsg("週次計画を提出しました");
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(result.error ?? "提出に失敗しました");
      }
    }
  };

  const isEditable =
    !currentPlan ||
    currentPlan.status === "draft" ||
    currentPlan.status === "rejected";

  return (
    <div className="space-y-6">
      {/* Current Week Plan */}
      <div className="rounded-lg border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-accent-color" />
            <div>
              <h2 className="text-lg font-semibold text-primary">
                今週の計画
              </h2>
              <p className="text-sm text-muted-foreground">
                {formatWeekRange(currentMonday)}
              </p>
            </div>
          </div>
          {currentPlan && (
            <span
              className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${statusConfig[currentPlan.status]?.bg ?? ""} ${statusConfig[currentPlan.status]?.text ?? ""}`}
            >
              {statusConfig[currentPlan.status]?.label ?? currentPlan.status}
            </span>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Rejection comment */}
          {currentPlan?.status === "rejected" && rejectionLog && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-danger">
                差し戻しコメント
              </p>
              <p className="mt-1 text-sm text-foreground">
                {rejectionLog.comment}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {rejectionLog.actor_name} -{" "}
                {formatDateJP(rejectionLog.created_at)}
              </p>
            </div>
          )}

          {/* Approval info */}
          {currentPlan?.status === "approved" && approvalLog && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <p className="text-sm font-medium text-success">
                  {approvalLog.actor_name}が承認しました
                </p>
                <span className="text-xs text-muted-foreground">
                  {formatDateJP(approvalLog.created_at)}
                </span>
              </div>
              {approvalLog.comment && (
                <p className="mt-2 text-sm text-foreground">
                  {approvalLog.comment}
                </p>
              )}
            </div>
          )}

          {/* Execution rate */}
          {currentPlan?.execution_rate != null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  実行率
                </span>
                <span className="text-sm font-mono text-primary">
                  {Number(currentPlan.execution_rate).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-success transition-all"
                  style={{
                    width: `${Math.min(100, Number(currentPlan.execution_rate))}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Template selector */}
          {templates.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-muted">
              <p className="text-sm text-muted-foreground">
                計画テンプレートが設定されていません。管理者に設定を依頼してください。
              </p>
            </div>
          ) : (
            <>
              {templates.length > 1 && isEditable && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    テンプレート
                  </label>
                  <Select
                    value={selectedTemplate}
                    onValueChange={setSelectedTemplate}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="テンプレート選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {activeTemplate && (
                <DynamicForm
                  schema={activeTemplate.schema as TemplateSchema}
                  values={formValues}
                  onChange={setFormValues}
                  readOnly={!isEditable}
                />
              )}

              {/* Action buttons */}
              {isEditable && (
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={saving || submitting}
                    className="border-border"
                  >
                    <FileEdit className="mr-1 h-4 w-4" />
                    {saving ? "保存中..." : "下書き保存"}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={saving || submitting}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    {submitting ? "提出中..." : "提出"}
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Messages */}
          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}
          {successMsg && (
            <p className="text-sm text-success">{successMsg}</p>
          )}

          {/* Approval flow for current plan (read-only - approval actions are in the approval queue) */}
          {currentPlan &&
            currentPlan.status !== "draft" && (
              <ApprovalFlow
                targetType="weekly_plan"
                targetId={currentPlan.id}
                currentStatus={currentPlan.status}
                isManager={false}
                logs={currentPlanLogs}
              />
            )}
        </div>
      </div>

      {/* Past plans */}
      {pastPlans.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-primary">過去の計画</h2>
          <div className="space-y-2">
            {pastPlans.map((plan) => {
              const isExpanded = expandedPlanId === plan.id;
              const planLogs = approvalLogs.filter(
                (l) => l.target_id === plan.id
              );
              const planTemplate = templates.find(
                (t) => t.id === plan.template_id
              );

              return (
                <div
                  key={plan.id}
                  className="rounded-lg border border-border bg-white"
                >
                  <button
                    onClick={() =>
                      setExpandedPlanId(isExpanded ? null : plan.id)
                    }
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground">
                        {formatWeekRange(plan.week_start)}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusConfig[plan.status]?.bg ?? ""} ${statusConfig[plan.status]?.text ?? ""}`}
                      >
                        {statusConfig[plan.status]?.label ?? plan.status}
                      </span>
                      {plan.execution_rate != null && (
                        <span className="text-xs font-mono text-muted-foreground">
                          実行率: {Number(plan.execution_rate).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border p-4 space-y-4">
                      {planTemplate && (
                        <DynamicForm
                          schema={planTemplate.schema as TemplateSchema}
                          values={
                            (plan.items as Record<string, unknown>) ?? {}
                          }
                          onChange={() => {}}
                          readOnly
                        />
                      )}
                      {planLogs.length > 0 && (
                        <ApprovalFlow
                          targetType="weekly_plan"
                          targetId={plan.id}
                          currentStatus={plan.status}
                          isManager={false}
                          logs={planLogs}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
