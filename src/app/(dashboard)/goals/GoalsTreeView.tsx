"use client";

import React, { useState, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Pencil,
  Target,
  Users,
  User as UserIcon,
  Calendar,
} from "lucide-react";
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
import {
  OptionalSelect,
  parseOptionalSelect,
} from "@/components/shared/OptionalSelect";
import { createGoal, deleteGoal, updateGoal } from "./actions";
import { useServerAction } from "@/hooks/useServerAction";
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
  company: "bg-primary text-white",
  department: "bg-accent-color text-white",
  team: "bg-success text-white",
  individual: "bg-warning text-white",
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

  for (const goal of goals) {
    nodeMap[goal.id] = {
      ...goal,
      children: [],
      snapshot: snapshotMap[goal.id] || null,
    };
  }

  for (const goal of goals) {
    const node = nodeMap[goal.id];
    if (goal.parent_id && nodeMap[goal.parent_id]) {
      nodeMap[goal.parent_id].children.push(node);
    } else {
      roots.push(node);
    }
  }

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

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function GoalNodeRow({
  node,
  depth,
  users,
  teams,
  onDelete,
  onEdit,
  canEdit,
}: {
  node: GoalNode;
  depth: number;
  users: Pick<User, "id" | "name" | "role">[];
  teams: Pick<Team, "id" | "name">[];
  onDelete: (id: string) => void;
  onEdit: (node: GoalNode) => void;
  canEdit: boolean;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const actualValue = node.snapshot ? Number(node.snapshot.actual_value) : 0;
  const progressRate = node.snapshot ? Number(node.snapshot.progress_rate) : 0;
  const targetValue = Number(node.target_value);

  const ownerName = node.owner_id
    ? users.find((u) => u.id === node.owner_id)?.name
    : null;
  const teamName = node.team_id
    ? teams.find((t) => t.id === node.team_id)?.name
    : null;

  return (
    <>
      {/* Desktop row */}
      <div
        className="hidden md:flex items-center gap-2 py-2.5 px-3 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer group"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
        onClick={() => canEdit && onEdit(node)}
      >
        {/* Expand/collapse */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="w-5 h-5 flex items-center justify-center shrink-0"
          disabled={!hasChildren}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
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

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground truncate block">
            {node.name}
          </span>
          <div className="flex items-center gap-3 mt-0.5">
            {ownerName && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <UserIcon className="h-3 w-3" />
                {ownerName}
              </span>
            )}
            {teamName && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {teamName}
              </span>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDateShort(node.period_start)} - {formatDateShort(node.period_end)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 shrink-0 w-48">
          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                progressRate >= 100
                  ? "bg-success"
                  : progressRate >= 50
                    ? "bg-accent-color"
                    : "bg-warning"
              }`}
              style={{ width: `${Math.min(progressRate, 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground font-mono w-12 text-right">
            {progressRate.toFixed(1)}%
          </span>
        </div>

        {/* Values */}
        <span className="text-xs text-muted-foreground font-mono shrink-0 w-24 text-right">
          {actualValue} / {targetValue}
        </span>

        {/* Actions */}
        {canEdit && (
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(node);
              }}
              className="text-muted-foreground hover:text-primary p-1"
              title="編集"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id);
              }}
              className="text-muted-foreground hover:text-danger p-1"
              title="削除"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile card */}
      <div
        className="md:hidden border-b border-border"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        <div
          className="p-3 hover:bg-muted/50 transition-colors cursor-pointer active:bg-muted"
          onClick={() => canEdit && onEdit(node)}
        >
          <div className="flex items-start gap-2">
            {/* Expand/collapse */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5"
              disabled={!hasChildren}
            >
              {hasChildren ? (
                expanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )
              ) : (
                <span className="w-4" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              {/* Level badge + name */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${levelColors[node.level]}`}
                >
                  {levelLabels[node.level]}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {node.name}
                </span>
              </div>

              {/* Meta info */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {ownerName && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <UserIcon className="h-3 w-3" />
                    {ownerName}
                  </span>
                )}
                {teamName && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <Users className="h-3 w-3" />
                    {teamName}
                  </span>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <Calendar className="h-3 w-3" />
                  {formatDateShort(node.period_start)} - {formatDateShort(node.period_end)}
                </span>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      progressRate >= 100
                        ? "bg-success"
                        : progressRate >= 50
                          ? "bg-accent-color"
                          : "bg-warning"
                    }`}
                    style={{ width: `${Math.min(progressRate, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground font-mono shrink-0">
                  {progressRate.toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground font-mono shrink-0">
                  {actualValue}/{targetValue}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Children */}
      {expanded &&
        node.children.map((child) => (
          <GoalNodeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            users={users}
            teams={teams}
            onDelete={onDelete}
            onEdit={onEdit}
            canEdit={canEdit}
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editNode, setEditNode] = useState<GoalNode | null>(null);

  const tree = buildTree(goals, snapshotMap);

  const canCreate =
    currentUserRole === "super_admin" ||
    currentUserRole === "admin" ||
    currentUserRole === "manager";

  const {
    execute: execCreate,
    isPending: isCreating,
    error: createError,
  } = useServerAction(createGoal, {
    onSuccess: () => setCreateDialogOpen(false),
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const { execute: execDelete } = useServerAction(deleteGoal, {
    onError: (msg) => alert(msg),
  });

  const handleDelete = useCallback(
    (goalId: string) => {
      if (!confirm("この目標を削除しますか？")) return;
      execDelete(goalId);
    },
    [execDelete]
  );

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    execCreate({
      name: formData.get("name") as string,
      level: formData.get("level") as GoalLevel,
      target_value: Number(formData.get("target_value")),
      kpi_field_key: (formData.get("kpi_field_key") as string) || undefined,
      template_id: parseOptionalSelect(formData, "template_id"),
      period_start: formData.get("period_start") as string,
      period_end: formData.get("period_end") as string,
      owner_id: parseOptionalSelect(formData, "owner_id"),
      team_id: parseOptionalSelect(formData, "team_id"),
      parent_id: parseOptionalSelect(formData, "parent_id"),
    });
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editNode) return;
    setIsUpdating(true);
    setUpdateError(null);
    const formData = new FormData(e.currentTarget);
    try {
      const result = await updateGoal(editNode.id, {
        name: formData.get("name") as string,
        level: formData.get("level") as GoalLevel,
        target_value: Number(formData.get("target_value")),
        kpi_field_key: (formData.get("kpi_field_key") as string) || undefined,
        template_id: parseOptionalSelect(formData, "template_id"),
        period_start: formData.get("period_start") as string,
        period_end: formData.get("period_end") as string,
        owner_id: parseOptionalSelect(formData, "owner_id"),
        team_id: parseOptionalSelect(formData, "team_id"),
        parent_id: parseOptionalSelect(formData, "parent_id"),
      });
      if (result.success) {
        setEditNode(null);
      } else {
        setUpdateError(result.error ?? "更新に失敗しました");
      }
    } catch {
      setUpdateError("予期しないエラーが発生しました");
    } finally {
      setIsUpdating(false);
    }
  };

  const goalFormFields = (defaults?: GoalNode | null) => (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">目標名</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={defaults?.name ?? ""}
          placeholder="例: 月間推薦数 50件"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="level">レベル</Label>
          <Select name="level" required defaultValue={defaults?.level ?? "team"}>
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
            defaultValue={defaults ? Number(defaults.target_value) : ""}
            placeholder="50"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="kpi_field_key">KPIフィールドキー</Label>
        <Input
          id="kpi_field_key"
          name="kpi_field_key"
          defaultValue={defaults?.kpi_field_key ?? ""}
          placeholder="例: recommendation_count"
        />
        <p className="text-xs text-muted-foreground">
          日報テンプレートのフィールドキーを指定すると自動集計されます
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="template_id">テンプレート</Label>
        <OptionalSelect
          name="template_id"
          placeholder="テンプレート選択（任意）"
          defaultValue={defaults?.template_id ?? undefined}
        >
          {templates.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </OptionalSelect>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="period_start">開始日</Label>
          <Input
            id="period_start"
            name="period_start"
            type="date"
            required
            defaultValue={defaults?.period_start ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="period_end">終了日</Label>
          <Input
            id="period_end"
            name="period_end"
            type="date"
            required
            defaultValue={defaults?.period_end ?? ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="owner_id">担当者</Label>
          <OptionalSelect
            name="owner_id"
            placeholder="担当者選択（任意）"
            defaultValue={defaults?.owner_id ?? undefined}
          >
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </OptionalSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="team_id">チーム</Label>
          <OptionalSelect
            name="team_id"
            placeholder="チーム選択（任意）"
            defaultValue={defaults?.team_id ?? undefined}
          >
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </OptionalSelect>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="parent_id">親目標</Label>
        <OptionalSelect
          name="parent_id"
          placeholder="親目標選択（任意）"
          noneLabel="なし（ルート目標）"
          defaultValue={defaults?.parent_id ?? undefined}
        >
          {goals
            .filter((g) => g.id !== defaults?.id)
            .map((g) => (
              <SelectItem key={g.id} value={g.id}>
                [{levelLabels[g.level]}] {g.name}
              </SelectItem>
            ))}
        </OptionalSelect>
      </div>
    </>
  );

  return (
    <>
      <div className="border border-border rounded-xl overflow-hidden bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted">
          <h2 className="text-sm font-semibold text-primary flex items-center gap-1.5">
            <Target className="h-4 w-4" />
            目標ツリー
          </h2>
          {canCreate && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-1" />
                  目標作成
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>目標作成</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  {goalFormFields()}
                  {createError && (
                    <p className="text-sm text-danger">{createError}</p>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                    >
                      キャンセル
                    </Button>
                    <Button
                      type="submit"
                      disabled={isCreating}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isCreating ? "作成中..." : "作成"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Column headers - desktop only */}
        <div className="hidden md:flex items-center gap-2 py-2 px-3 border-b border-border bg-slate-50 text-xs text-muted-foreground font-medium">
          <span className="flex-1 pl-8">目標名</span>
          <span className="w-48 text-center">進捗</span>
          <span className="w-24 text-right">実績 / 目標</span>
          <span className="w-16" />
        </div>

        {/* Tree */}
        {tree.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            目標がまだ作成されていません
          </div>
        ) : (
          tree.map((node) => (
            <GoalNodeRow
              key={node.id}
              node={node}
              depth={0}
              users={users}
              teams={teams}
              onDelete={handleDelete}
              onEdit={setEditNode}
              canEdit={canCreate}
            />
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editNode} onOpenChange={(open) => !open && setEditNode(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              目標を編集
            </DialogTitle>
          </DialogHeader>

          {editNode && (
            <>
              {/* Progress summary */}
              <div className="rounded-lg border border-border bg-muted p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    現在の進捗
                  </span>
                  <span className="text-lg font-bold font-mono text-primary">
                    {editNode.snapshot
                      ? `${Number(editNode.snapshot.progress_rate).toFixed(1)}%`
                      : "0.0%"}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all ${
                      editNode.snapshot && Number(editNode.snapshot.progress_rate) >= 100
                        ? "bg-success"
                        : editNode.snapshot && Number(editNode.snapshot.progress_rate) >= 50
                          ? "bg-accent-color"
                          : "bg-warning"
                    }`}
                    style={{
                      width: `${Math.min(editNode.snapshot ? Number(editNode.snapshot.progress_rate) : 0, 100)}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    実績: {editNode.snapshot ? Number(editNode.snapshot.actual_value) : 0}
                  </span>
                  <span>目標: {Number(editNode.target_value)}</span>
                </div>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                {goalFormFields(editNode)}
                {updateError && (
                  <p className="text-sm text-danger">{updateError}</p>
                )}
                <div className="flex justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-danger text-danger hover:bg-red-50"
                    onClick={() => {
                      handleDelete(editNode.id);
                      setEditNode(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    削除
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditNode(null)}
                    >
                      キャンセル
                    </Button>
                    <Button
                      type="submit"
                      disabled={isUpdating}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isUpdating ? "保存中..." : "保存"}
                    </Button>
                  </div>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
