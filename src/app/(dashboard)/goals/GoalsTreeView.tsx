"use client";

import React, { useState } from "react";
import { ChevronRight, ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createGoal, deleteGoal } from "./actions";
import type {
  Goal,
  GoalSnapshot,
  GoalLevel,
  Role,
  User,
  Team,
  ReportTemplate,
} from "@/types/database";

interface GoalsTreeViewProps {
  goals: Goal[];
  snapshotMap: Record<string, GoalSnapshot>;
  users: Pick<User, "id" | "name" | "role">[];
  teams: Pick<Team, "id" | "name">[];
  templates: Pick<ReportTemplate, "id" | "name" | "type">[];
  currentUserRole: Role;
}

const levelLabels: Record<GoalLevel, string> = {
  company: "会社",
  department: "部門",
  team: "チーム",
  individual: "個人",
};

const levelColors: Record<GoalLevel, string> = {
  company: "bg-[#0C025F] text-white",
  department: "bg-[#2563EB] text-white",
  team: "bg-[#059669] text-white",
  individual: "bg-[#D97706] text-white",
};

interface GoalNode extends Goal {
  children: GoalNode[];
  snapshot: GoalSnapshot | null;
}

function buildTree(
  goals: Goal[],
  snapshotMap: Record<string, GoalSnapshot>
): GoalNode[] {
  const nodeMap: Record<string, GoalNode> = {};
  const roots: GoalNode[] = [];

  // Create nodes
  for (const goal of goals) {
    nodeMap[goal.id] = {
      ...goal,
      children: [],
      snapshot: snapshotMap[goal.id] || null,
    };
  }

  // Build tree
  for (const goal of goals) {
    const node = nodeMap[goal.id];
    if (goal.parent_id && nodeMap[goal.parent_id]) {
      nodeMap[goal.parent_id].children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort by level order
  const levelOrder: GoalLevel[] = [
    "company",
    "department",
    "team",
    "individual",
  ];
  const sortNodes = (nodes: GoalNode[]) => {
    nodes.sort(
      (a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level)
    );
    for (const node of nodes) {
      sortNodes(node.children);
    }
  };
  sortNodes(roots);

  return roots;
}

function GoalNodeRow({
  node,
  depth,
  onDelete,
}: {
  node: GoalNode;
  depth: number;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const actualValue = node.snapshot
    ? Number(node.snapshot.actual_value)
    : 0;
  const progressRate = node.snapshot
    ? Number(node.snapshot.progress_rate)
    : 0;
  const targetValue = Number(node.target_value);

  return (
    <>
      <div
        className="flex items-center gap-2 py-2 px-3 border-b border-slate-200 hover:bg-[#F0F4FF] transition-colors"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {/* Expand/collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-5 h-5 flex items-center justify-center shrink-0"
          disabled={!hasChildren}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-[#64748B]" />
            ) : (
              <ChevronRight className="h-4 w-4 text-[#64748B]" />
            )
          ) : (
            <span className="w-4" />
          )}
        </button>

        {/* Level badge */}
        <span
          className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${levelColors[node.level]}`}
        >
          {levelLabels[node.level]}
        </span>

        {/* Name */}
        <span className="text-sm font-medium text-[#1E293B] truncate flex-1 min-w-0">
          {node.name}
        </span>

        {/* Progress bar */}
        <div className="flex items-center gap-2 shrink-0 w-48">
          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                progressRate >= 100
                  ? "bg-[#059669]"
                  : progressRate >= 50
                    ? "bg-[#2563EB]"
                    : "bg-[#D97706]"
              }`}
              style={{ width: `${Math.min(progressRate, 100)}%` }}
            />
          </div>
          <span className="text-xs text-[#64748B] font-mono w-12 text-right">
            {progressRate.toFixed(1)}%
          </span>
        </div>

        {/* Values */}
        <span className="text-xs text-[#64748B] font-mono shrink-0 w-24 text-right">
          {actualValue} / {targetValue}
        </span>

        {/* Delete */}
        <button
          onClick={() => onDelete(node.id)}
          className="text-[#64748B] hover:text-[#DC2626] p-1 shrink-0"
          title="削除"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Children */}
      {expanded &&
        node.children.map((child) => (
          <GoalNodeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            onDelete={onDelete}
          />
        ))}
    </>
  );
}

export function GoalsTreeView({
  goals,
  snapshotMap,
  users,
  teams,
  templates,
  currentUserRole,
}: GoalsTreeViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tree = buildTree(goals, snapshotMap);

  const canCreate =
    currentUserRole === "super_admin" ||
    currentUserRole === "admin" ||
    currentUserRole === "manager";

  const handleDelete = async (goalId: string) => {
    if (!confirm("この目標を削除しますか？")) return;
    const result = await deleteGoal(goalId);
    if (!result.success) {
      alert(result.error ?? "削除に失敗しました");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createGoal({
      name: formData.get("name") as string,
      level: formData.get("level") as GoalLevel,
      target_value: Number(formData.get("target_value")),
      kpi_field_key: (formData.get("kpi_field_key") as string) || undefined,
      template_id: (formData.get("template_id") as string) || undefined,
      period_start: formData.get("period_start") as string,
      period_end: formData.get("period_end") as string,
      owner_id: (formData.get("owner_id") as string) || undefined,
      team_id: (formData.get("team_id") as string) || undefined,
      parent_id: (formData.get("parent_id") as string) || undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      setDialogOpen(false);
    } else {
      setError(result.error ?? "作成に失敗しました");
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-[#F0F4FF]">
        <h2 className="text-sm font-semibold text-[#0C025F]">目標ツリー</h2>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#0C025F] hover:bg-[#0C025F]/90">
                <Plus className="h-4 w-4 mr-1" />
                目標作成
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>目標作成</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">目標名</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    placeholder="例: 月間推薦数 50件"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="level">レベル</Label>
                    <Select name="level" required defaultValue="team">
                      <SelectTrigger>
                        <SelectValue placeholder="レベル選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="company">会社</SelectItem>
                        <SelectItem value="department">部門</SelectItem>
                        <SelectItem value="team">チーム</SelectItem>
                        <SelectItem value="individual">個人</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target_value">目標値</Label>
                    <Input
                      id="target_value"
                      name="target_value"
                      type="number"
                      required
                      min={0}
                      step="any"
                      placeholder="50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kpi_field_key">KPIフィールドキー</Label>
                  <Input
                    id="kpi_field_key"
                    name="kpi_field_key"
                    placeholder="例: recommendation_count"
                  />
                  <p className="text-xs text-[#64748B]">
                    日報テンプレートのフィールドキーを指定すると自動集計されます
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template_id">テンプレート</Label>
                  <Select name="template_id">
                    <SelectTrigger>
                      <SelectValue placeholder="テンプレート選択（任意）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">なし</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="period_start">開始日</Label>
                    <Input
                      id="period_start"
                      name="period_start"
                      type="date"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="period_end">終了日</Label>
                    <Input
                      id="period_end"
                      name="period_end"
                      type="date"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="owner_id">担当者</Label>
                    <Select name="owner_id">
                      <SelectTrigger>
                        <SelectValue placeholder="担当者選択（任意）" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">なし</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team_id">チーム</Label>
                    <Select name="team_id">
                      <SelectTrigger>
                        <SelectValue placeholder="チーム選択（任意）" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">なし</SelectItem>
                        {teams.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parent_id">親目標</Label>
                  <Select name="parent_id">
                    <SelectTrigger>
                      <SelectValue placeholder="親目標選択（任意）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">なし（ルート目標）</SelectItem>
                      {goals.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          [{levelLabels[g.level]}] {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <p className="text-sm text-[#DC2626]">{error}</p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#0C025F] hover:bg-[#0C025F]/90"
                  >
                    {isSubmitting ? "作成中..." : "作成"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-2 py-2 px-3 border-b border-slate-200 bg-slate-50 text-xs text-[#64748B] font-medium">
        <span className="flex-1 pl-8">目標名</span>
        <span className="w-48 text-center">進捗</span>
        <span className="w-24 text-right">実績 / 目標</span>
        <span className="w-8" />
      </div>

      {/* Tree */}
      {tree.length === 0 ? (
        <div className="py-12 text-center text-sm text-[#64748B]">
          目標がまだ作成されていません
        </div>
      ) : (
        tree.map((node) => (
          <GoalNodeRow
            key={node.id}
            node={node}
            depth={0}
            onDelete={handleDelete}
          />
        ))
      )}
    </div>
  );
}
