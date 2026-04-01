"use client";

import React, { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  listFeatureRequests,
  updateFeatureRequest,
} from "@/app/(dashboard)/feature-requests/actions";

interface FeatureRequest {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  admin_note: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
  users: { name: string; email: string } | null;
  tenants: { name: string } | null;
}

interface Props {
  initialRequests: FeatureRequest[];
}

const STATUS_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "open", label: "未対応" },
  { value: "in_review", label: "レビュー中" },
  { value: "planned", label: "対応予定" },
  { value: "in_progress", label: "対応中" },
  { value: "done", label: "完了" },
  { value: "declined", label: "見送り" },
] as const;

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "未対応", color: "bg-orange-100 text-orange-700" },
  in_review: { label: "レビュー中", color: "bg-blue-100 text-blue-700" },
  planned: { label: "対応予定", color: "bg-purple-100 text-purple-700" },
  in_progress: { label: "対応中", color: "bg-primary/10 text-primary" },
  done: { label: "完了", color: "bg-green-100 text-green-700" },
  declined: { label: "見送り", color: "bg-muted text-muted-foreground" },
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  bug: { label: "不具合", color: "bg-danger/10 text-danger" },
  feature: { label: "新機能", color: "bg-primary/10 text-primary" },
  improvement: { label: "改善", color: "bg-warning/10 text-warning" },
  other: { label: "その他", color: "bg-muted text-muted-foreground" },
};

const PRIORITY_OPTIONS = [
  { value: 0, label: "−" },
  { value: 1, label: "低" },
  { value: 2, label: "中" },
  { value: 3, label: "高" },
];

export function FeatureRequestsAdmin({ initialRequests }: Props) {
  const [requests, setRequests] = useState<FeatureRequest[]>(initialRequests);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredRequests =
    statusFilter === "all"
      ? requests
      : requests.filter((r: FeatureRequest) => r.status === statusFilter);

  const statusCounts = requests.reduce(
    (acc: Record<string, number>, r: FeatureRequest) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const handleStatusChange = (id: string, newStatus: string) => {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("status", newStatus);

    startTransition(async () => {
      const result = await updateFeatureRequest(formData);
      if (result.success) {
        setRequests((prev: FeatureRequest[]) =>
          prev.map((r: FeatureRequest) => (r.id === id ? { ...r, status: newStatus, updated_at: new Date().toISOString() } : r))
        );
      }
    });
  };

  const handlePriorityChange = (id: string, priority: number) => {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("priority", String(priority));

    startTransition(async () => {
      const result = await updateFeatureRequest(formData);
      if (result.success) {
        setRequests((prev: FeatureRequest[]) =>
          prev.map((r: FeatureRequest) => (r.id === id ? { ...r, priority } : r))
        );
      }
    });
  };

  const handleNoteSave = (id: string, note: string) => {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("admin_note", note);

    startTransition(async () => {
      const result = await updateFeatureRequest(formData);
      if (result.success) {
        setRequests((prev: FeatureRequest[]) =>
          prev.map((r: FeatureRequest) => (r.id === id ? { ...r, admin_note: note } : r))
        );
      }
    });
  };

  const refreshList = () => {
    startTransition(async () => {
      const result = await listFeatureRequests();
      if (result.success) {
        setRequests(result.data as FeatureRequest[]);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => {
          const count =
            opt.value === "all"
              ? requests.length
              : statusCounts[opt.value] || 0;
          return (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                statusFilter === opt.value
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt.label}
              {count > 0 && (
                <span className="ml-1 opacity-70">({count})</span>
              )}
            </button>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshList}
          disabled={isPending}
          className="ml-auto text-xs"
        >
          {isPending ? "更新中..." : "更新"}
        </Button>
      </div>

      {/* Request list */}
      {filteredRequests.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          リクエストがありません
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req: FeatureRequest) => {
            const cat = CATEGORY_LABELS[req.category] || CATEGORY_LABELS.other;
            const st = STATUS_LABELS[req.status] || STATUS_LABELS.open;
            const isExpanded = expandedId === req.id;

            return (
              <Card key={req.id} className="overflow-hidden">
                <CardContent className="p-4">
                  {/* Header row */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() =>
                          setExpandedId(isExpanded ? null : req.id)
                        }
                        className="text-left w-full"
                      >
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cat.color}`}
                          >
                            {cat.label}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st.color}`}
                          >
                            {st.label}
                          </span>
                          {req.priority > 0 && (
                            <span className="text-[10px] font-medium text-danger">
                              {"!".repeat(req.priority)}
                              {" "}
                              {PRIORITY_OPTIONS[req.priority]?.label}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-medium text-foreground">
                          {req.title}
                        </h3>
                      </button>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{req.tenants?.name ?? "不明"}</span>
                        <span>/</span>
                        <span>{req.users?.name ?? "不明"}</span>
                        <span>/</span>
                        <span>
                          {new Date(req.created_at).toLocaleDateString("ja-JP")}
                        </span>
                      </div>
                    </div>

                    {/* Status dropdown */}
                    <select
                      value={req.status}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        handleStatusChange(req.id, e.target.value)
                      }
                      disabled={isPending}
                      className="rounded-lg border border-border bg-white px-2 py-1 text-xs"
                    >
                      {STATUS_OPTIONS.filter((s) => s.value !== "all").map(
                        (s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <ExpandedDetail
                      req={req}
                      isPending={isPending}
                      onPriorityChange={handlePriorityChange}
                      onNoteSave={handleNoteSave}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExpandedDetail({
  req,
  isPending,
  onPriorityChange,
  onNoteSave,
}: {
  req: FeatureRequest;
  isPending: boolean;
  onPriorityChange: (id: string, p: number) => void;
  onNoteSave: (id: string, note: string) => void;
}) {
  const [note, setNote] = useState(req.admin_note ?? "");

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-3">
      {/* Description */}
      {req.description && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            詳細
          </p>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {req.description}
          </p>
        </div>
      )}

      {/* Priority */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">
          優先度
        </p>
        <div className="flex gap-1">
          {PRIORITY_OPTIONS.map((p) => (
            <button
              key={p.value}
              onClick={() => onPriorityChange(req.id, p.value)}
              disabled={isPending}
              className={`rounded px-2 py-0.5 text-xs font-medium transition-all ${
                req.priority === p.value
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Admin note */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">
          内部メモ
        </p>
        <Textarea
          value={note}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
          rows={2}
          placeholder="対応方針や技術的なメモを記載"
          className="text-sm"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => onNoteSave(req.id, note)}
          disabled={isPending || note === (req.admin_note ?? "")}
          className="mt-1"
        >
          メモ保存
        </Button>
      </div>

      {/* Meta */}
      <div className="text-[10px] text-muted-foreground">
        ID: {req.id} / 更新:{" "}
        {new Date(req.updated_at).toLocaleString("ja-JP")}
      </div>
    </div>
  );
}
