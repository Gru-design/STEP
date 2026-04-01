"use client";

import React, { useState, useMemo } from "react";
import { DynamicForm } from "@/components/reports/DynamicForm";
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ChevronRight,
  Inbox,
} from "lucide-react";
import type {
  ReportTemplate,
  ApprovalLog,
  TemplateSchema,
} from "@/types/database";
import type { PlanWithUser } from "./page";

interface ApprovedPlansClientProps {
  plans: PlanWithUser[];
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

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  approved: { label: "承認済", bg: "bg-green-100", text: "text-green-700" },
  rejected: { label: "差し戻し", bg: "bg-red-100", text: "text-red-700" },
};

export function ApprovedPlansClient({
  plans,
  templates,
  approvalLogs,
}: ApprovedPlansClientProps) {
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  const logsByPlan = useMemo(() => {
    const map: Record<string, (ApprovalLog & { actor_name?: string })[]> = {};
    for (const log of approvalLogs) {
      if (!map[log.target_id]) map[log.target_id] = [];
      map[log.target_id].push(log);
    }
    return map;
  }, [approvalLogs]);

  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white py-16">
        <Inbox className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-lg font-medium text-foreground">
          承認済みの計画はありません
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          承認・差し戻した計画がここに表示されます
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {plans.map((plan) => {
        const isExpanded = expandedPlanId === plan.id;
        const planTemplate = templates.find((t) => t.id === plan.template_id);
        const planLogs = logsByPlan[plan.id] ?? [];
        const config = statusConfig[plan.status] ?? statusConfig.approved;

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
              className="flex w-full items-center justify-between px-4 sm:px-6 py-4 text-left hover:bg-muted/50 transition-colors rounded-t-xl"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {plan.user_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatWeekRange(plan.week_start)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {plan.execution_rate != null && (
                  <span className="hidden sm:inline text-xs font-mono text-muted-foreground">
                    実行率: {Number(plan.execution_rate).toFixed(0)}%
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
                >
                  {plan.status === "approved" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {config.label}
                </span>
                <ChevronRight
                  className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
                />
              </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-border p-4 sm:p-6 space-y-6">
                {/* Execution rate bar */}
                {plan.execution_rate != null && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        実行率
                      </span>
                      <span className="text-sm font-mono text-primary">
                        {Number(plan.execution_rate).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-success transition-all"
                        style={{
                          width: `${Math.min(100, Number(plan.execution_rate))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

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
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
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
                          {log.comment && (
                            <p className="mt-1 text-sm text-foreground">
                              {log.comment}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
