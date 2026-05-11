"use client";

import React, { useState, useCallback, useMemo } from "react";
import Link from "next/link";
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
  AlertTriangle,
  Copy,
  Settings,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Circle,
  Search,
  X,
  Clock,
  ListTree,
  AlertOctagon,
  Trophy,
} from "lucide-react";
import { getKpiCandidateFields } from "@/lib/templates/fields";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  OptionalSelect,
  parseOptionalSelect,
} from "@/components/shared/OptionalSelect";
import { createGoal, deleteGoal, updateGoal } from "./actions";
import { BulkCreateDialog } from "./BulkCreateDialog";
import { useServerAction } from "@/hooks/useServerAction";
import {
  computeGoalStatus,
  goalStatusLabels,
  goalStatusStyles,
  type GoalStatus,
  type GoalStatusInfo,
} from "@/lib/goals/status";
import type {
  Goal,
  GoalSnapshot,
  GoalLevel,
  Role,
  User,
  Team,
  ReportTemplate,
  GoalPreset,
  GoalPresetItem,
} from "@/types/database";

interface GoalsTreeViewProps {
  goals: Goal[];
  snapshotMap: Record<string, GoalSnapshot>;
  users: Pick<User, "id" | "name" | "role">[];
  teams: Pick<Team, "id" | "name">[];
  templates: Pick<ReportTemplate, "id" | "name" | "type" | "schema">[];
  currentUserRole: Role;
  currentUserId: string;
  presets: GoalPreset[];
  presetItemsByPreset: Record<string, GoalPresetItem[]>;
}

const levelLabels: Record<GoalLevel, string> = {
  company: "会社",
  department: "部門",
  team: "チーム",
  individual: "個人",
};

const levelBadgeClass: Record<GoalLevel, string> = {
  company: "bg-primary text-white",
  department: "bg-accent-color text-white",
  team: "bg-success text-white",
  individual: "bg-warning text-white",
};

interface GoalNode extends Goal {
  children: GoalNode[];
  snapshot: GoalSnapshot | null;
  statusInfo: GoalStatusInfo;
}

interface KpiSourceSectionProps {
  templates: Pick<ReportTemplate, "id" | "name" | "type" | "schema">[];
  defaultTemplateId: string | null;
  defaultKpiFieldKey: string | null;
}

function KpiSourceSection({
  templates,
  defaultTemplateId,
  defaultKpiFieldKey,
}: KpiSourceSectionProps) {
  const [templateId, setTemplateId] = useState<string | null>(defaultTemplateId);
  const [kpiFieldKey, setKpiFieldKey] = useState<string | null>(
    defaultKpiFieldKey
  );

  const selectedTemplate = templateId
    ? templates.find((t) => t.id === templateId) ?? null
    : null;

  const candidates = selectedTemplate
    ? getKpiCandidateFields(selectedTemplate.schema)
    : [];

  // Surface a saved key whose target field was renamed/removed so the
  // user can re-link rather than silently losing aggregation.
  const isOrphan = Boolean(
    kpiFieldKey &&
      selectedTemplate &&
      !candidates.some((c) => c.key === kpiFieldKey)
  );

  const handleTemplateChange = (next: string | null) => {
    setTemplateId(next);
    if (next !== templateId) setKpiFieldKey(null);
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
      <div className="flex items-center gap-2">
        <Target className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">
          自動集計の設定（任意）
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="template_id" className="text-xs text-muted-foreground">
          集計対象テンプレート
        </Label>
        <OptionalSelect
          name="template_id"
          placeholder="テンプレートを選択"
          noneLabel="自動集計しない"
          value={templateId}
          onValueChange={handleTemplateChange}
        >
          {templates.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </OptionalSelect>
      </div>

      <div className="space-y-2">
        <Label htmlFor="kpi_field_key" className="text-xs text-muted-foreground">
          KPI集計フィールド
        </Label>
        {!templateId ? (
          <div className="rounded-lg border border-dashed border-border bg-white px-3 py-2.5 text-xs text-muted-foreground">
            先にテンプレートを選択してください
          </div>
        ) : candidates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-warning/40 bg-warning/5 px-3 py-2.5 text-xs text-warning">
            このテンプレートには集計可能な数値・評価フィールドがありません
          </div>
        ) : (
          <>
            <OptionalSelect
              name="kpi_field_key"
              placeholder="集計するフィールドを選択"
              noneLabel="集計しない"
              value={kpiFieldKey}
              onValueChange={setKpiFieldKey}
            >
              {isOrphan && kpiFieldKey && (
                <SelectItem value={kpiFieldKey}>
                  <span className="flex items-center gap-1.5 text-warning">
                    <AlertTriangle className="h-3 w-3" />
                    {kpiFieldKey}（フィールドが見つかりません）
                  </span>
                </SelectItem>
              )}
              {candidates.map((field) => (
                <SelectItem key={field.key} value={field.key}>
                  <span className="inline-flex items-center gap-2">
                    <span className="font-medium">{field.label}</span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {field.type === "rating" ? "評価" : "数値"}
                      {field.unit ? ` / ${field.unit}` : ""}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {field.key}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </OptionalSelect>
            {isOrphan && (
              <p className="flex items-start gap-1.5 text-xs text-warning">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  保存済みのフィールドキーがテンプレートに存在しません。
                  テンプレートでフィールドが削除またはリネームされた可能性があります。
                  正しいフィールドを再選択してください。
                </span>
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              選択したフィールドの提出値が、目標期間内で自動集計されます
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function buildTree(
  goals: Goal[],
  snapshotMap: Record<string, GoalSnapshot>,
  now: Date
): GoalNode[] {
  const nodeMap: Record<string, GoalNode> = {};
  const roots: GoalNode[] = [];

  for (const goal of goals) {
    nodeMap[goal.id] = {
      ...goal,
      children: [],
      snapshot: snapshotMap[goal.id] || null,
      statusInfo: computeGoalStatus(goal, snapshotMap[goal.id] || null, now),
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

function flattenTree(roots: GoalNode[]): GoalNode[] {
  const out: GoalNode[] = [];
  const walk = (n: GoalNode) => {
    out.push(n);
    n.children.forEach(walk);
  };
  roots.forEach(walk);
  return out;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * Shift a YYYY-MM-DD date string forward by `months` months, preserving
 * the day-of-month where possible (capping at the last day of the new
 * month so 2026-01-31 + 1 month becomes 2026-02-28).
 */
function shiftDateByMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const targetMonthIdx = m - 1 + months;
  const targetYear = y + Math.floor(targetMonthIdx / 12);
  const targetMonth = ((targetMonthIdx % 12) + 12) % 12;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const day = Math.min(d, lastDay);
  const mm = (targetMonth + 1).toString().padStart(2, "0");
  const dd = day.toString().padStart(2, "0");
  return `${targetYear}-${mm}-${dd}`;
}

/**
 * Build a synthetic GoalNode-shaped object that the create form can
 * consume as its `defaults`. Name is suffixed with " (コピー)" and the
 * period is shifted +1 month so the typical "copy last month's goal"
 * flow lands on the new period without manual editing.
 *
 * Note: `statusInfo` is filled with a neutral placeholder — the create
 * form only reads identity/period/KPI fields, not status.
 */
function buildDuplicateDefaults(source: Goal): GoalNode {
  const nextStart = shiftDateByMonths(source.period_start, 1);
  const nextEnd = shiftDateByMonths(source.period_end, 1);
  return {
    ...source,
    id: "",
    name: `${source.name} (コピー)`,
    period_start: nextStart,
    period_end: nextEnd,
    children: [],
    snapshot: null,
    statusInfo: computeGoalStatus(
      { period_start: nextStart, period_end: nextEnd, target_value: source.target_value },
      null,
      new Date()
    ),
  };
}

function getInitial(name?: string | null): string {
  if (!name) return "?";
  return name.slice(0, 1);
}

function StatusBadge({ status }: { status: GoalStatus }) {
  const styles = goalStatusStyles[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${styles.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {goalStatusLabels[status]}
    </span>
  );
}

function DaysRemainingBadge({ info }: { info: GoalStatusInfo }) {
  const { daysRemaining } = info;
  if (daysRemaining < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        終了
      </span>
    );
  }
  const tone =
    daysRemaining <= 3
      ? "text-danger"
      : daysRemaining <= 7
        ? "text-warning"
        : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] ${tone}`}>
      <Clock className="h-3 w-3" />
      残{daysRemaining}日
    </span>
  );
}

interface SummaryCardsProps {
  nodes: GoalNode[];
}

function SummaryCards({ nodes }: SummaryCardsProps) {
  const counts = useMemo(() => {
    const c: Record<GoalStatus, number> = {
      achieved: 0,
      ahead: 0,
      on_track: 0,
      behind: 0,
      at_risk: 0,
      not_started: 0,
      missed: 0,
      upcoming: 0,
    };
    let totalProgress = 0;
    let due7 = 0;
    for (const n of nodes) {
      c[n.statusInfo.status]++;
      totalProgress += n.snapshot ? Number(n.snapshot.progress_rate) : 0;
      if (
        n.statusInfo.daysRemaining >= 0 &&
        n.statusInfo.daysRemaining <= 7 &&
        n.statusInfo.status !== "achieved"
      ) {
        due7++;
      }
    }
    const total = nodes.length;
    const achieved = c.achieved;
    const onTrack = c.on_track + c.ahead;
    const behind = c.behind + c.at_risk + c.missed;
    const notStarted = c.not_started;
    const avg = total > 0 ? Math.round((totalProgress / total) * 10) / 10 : 0;
    return { total, achieved, onTrack, behind, notStarted, avg, due7 };
  }, [nodes]);

  const cards = [
    {
      label: "全目標",
      value: counts.total,
      sub: "件",
      icon: <Target className="h-4 w-4" />,
      tone: "text-primary",
      bg: "bg-primary-light",
    },
    {
      label: "達成",
      value: counts.achieved,
      sub: counts.total > 0
        ? `${Math.round((counts.achieved / counts.total) * 100)}%`
        : "0%",
      icon: <Trophy className="h-4 w-4" />,
      tone: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "順調・先行",
      value: counts.onTrack,
      sub: "件",
      icon: <TrendingUp className="h-4 w-4" />,
      tone: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "遅延・要注意",
      value: counts.behind,
      sub: "件",
      icon: <AlertOctagon className="h-4 w-4" />,
      tone: "text-danger",
      bg: "bg-danger/10",
    },
    {
      label: "未着手",
      value: counts.notStarted,
      sub: "件",
      icon: <Circle className="h-4 w-4" />,
      tone: "text-muted-foreground",
      bg: "bg-muted",
    },
    {
      label: "平均達成率",
      value: counts.avg,
      sub: "%",
      icon: <TrendingUp className="h-4 w-4" />,
      tone: "text-accent-color",
      bg: "bg-accent-light",
    },
    {
      label: "期限7日以内",
      value: counts.due7,
      sub: "件",
      icon: <Clock className="h-4 w-4" />,
      tone: counts.due7 > 0 ? "text-warning" : "text-muted-foreground",
      bg: counts.due7 > 0 ? "bg-warning/10" : "bg-muted",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-border bg-white p-3 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${card.bg} ${card.tone}`}
            >
              {card.icon}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              {card.label}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className={`font-mono text-2xl font-bold ${card.tone}`}>
              {card.value}
            </span>
            <span className="text-xs text-muted-foreground">{card.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function GoalNodeRow({
  node,
  depth,
  users,
  teams,
  onDelete,
  onEdit,
  canEdit,
  initiallyExpanded,
}: {
  node: GoalNode;
  depth: number;
  users: Pick<User, "id" | "name" | "role">[];
  teams: Pick<Team, "id" | "name">[];
  onDelete: (id: string) => void;
  onEdit: (node: GoalNode) => void;
  canEdit: boolean;
  initiallyExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const hasChildren = node.children.length > 0;
  const actualValue = node.snapshot ? Number(node.snapshot.actual_value) : 0;
  const progressRate = node.snapshot ? Number(node.snapshot.progress_rate) : 0;
  const targetValue = Number(node.target_value);
  const { status, elapsedRate, paceDelta } = node.statusInfo;
  const styles = goalStatusStyles[status];

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
        className="group hidden items-stretch border-b border-border transition-colors hover:bg-muted/40 md:flex"
        onClick={() => canEdit && onEdit(node)}
        style={{ cursor: canEdit ? "pointer" : "default" }}
      >
        {/* Status colour rail */}
        <div className={`w-1 shrink-0 ${styles.bar}`} aria-hidden />

        <div
          className="flex flex-1 items-center gap-3 py-3 pr-3"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          {/* Expand */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center"
            disabled={!hasChildren}
            aria-label={expanded ? "折りたたむ" : "展開"}
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

          {/* Owner avatar */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-primary">
            {ownerName ? getInitial(ownerName) : teamName ? <Users className="h-4 w-4" /> : <Target className="h-4 w-4" />}
          </div>

          {/* Name + meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${levelBadgeClass[node.level]}`}
              >
                {levelLabels[node.level]}
              </span>
              <span className="truncate text-sm font-semibold text-foreground">
                {node.name}
              </span>
              <StatusBadge status={status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {ownerName && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <UserIcon className="h-3 w-3" />
                  {ownerName}
                </span>
              )}
              {teamName && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {teamName}
                </span>
              )}
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDateShort(node.period_start)} - {formatDateShort(node.period_end)}
              </span>
              <DaysRemainingBadge info={node.statusInfo} />
            </div>
          </div>

          {/* Progress vs schedule */}
          <div className="w-56 shrink-0">
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
              {/* Elapsed marker — vertical line indicating "ideal pace" */}
              <div
                className="absolute top-0 z-10 h-full w-px bg-foreground/40"
                style={{ left: `${Math.min(elapsedRate, 100)}%` }}
                title={`期間経過 ${elapsedRate.toFixed(1)}%`}
              />
              <div
                className={`h-full rounded-full transition-all ${styles.bar}`}
                style={{ width: `${Math.min(progressRate, 100)}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="font-mono">進捗 {progressRate.toFixed(1)}%</span>
              <span className="font-mono">経過 {elapsedRate.toFixed(0)}%</span>
              <span
                className={`flex items-center gap-0.5 font-mono ${
                  paceDelta >= 0 ? "text-success" : "text-danger"
                }`}
              >
                {paceDelta >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {paceDelta >= 0 ? "+" : ""}
                {paceDelta.toFixed(0)}
              </span>
            </div>
          </div>

          {/* Values */}
          <div className="w-24 shrink-0 text-right">
            <div className="font-mono text-sm font-semibold text-foreground">
              {actualValue}
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">
              / {targetValue}
            </div>
          </div>

          {/* Actions */}
          {canEdit ? (
            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(node);
                }}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-primary"
                title="編集"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(node.id);
                }}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-danger"
                title="削除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="w-12 shrink-0" />
          )}
        </div>
      </div>

      {/* Mobile card */}
      <div
        className="border-b border-border md:hidden"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        <div
          className={`relative cursor-pointer p-3 transition-colors hover:bg-muted/40 active:bg-muted`}
          onClick={() => canEdit && onEdit(node)}
        >
          <div className={`absolute left-0 top-0 h-full w-1 ${styles.bar}`} />
          <div className="flex items-start gap-2 pl-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center"
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

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${levelBadgeClass[node.level]}`}
                >
                  {levelLabels[node.level]}
                </span>
                <StatusBadge status={status} />
                <span className="text-sm font-semibold text-foreground">
                  {node.name}
                </span>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {ownerName && (
                  <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                    <UserIcon className="h-3 w-3" />
                    {ownerName}
                  </span>
                )}
                {teamName && (
                  <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {teamName}
                  </span>
                )}
                <DaysRemainingBadge info={node.statusInfo} />
              </div>

              <div className="mt-2">
                <div className="relative h-2 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="absolute top-0 z-10 h-full w-px bg-foreground/40"
                    style={{ left: `${Math.min(elapsedRate, 100)}%` }}
                  />
                  <div
                    className={`h-full rounded-full transition-all ${styles.bar}`}
                    style={{ width: `${Math.min(progressRate, 100)}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="font-mono">
                    {progressRate.toFixed(1)}% / 経過 {elapsedRate.toFixed(0)}%
                  </span>
                  <span className="font-mono">
                    {actualValue}/{targetValue}
                  </span>
                </div>
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
            initiallyExpanded={initiallyExpanded}
          />
        ))}
    </>
  );
}

interface FilterState {
  search: string;
  level: GoalLevel | "all";
  status: GoalStatus | "all";
  ownerId: string | "all";
  teamId: string | "all";
  myOnly: boolean;
}

const initialFilter: FilterState = {
  search: "",
  level: "all",
  status: "all",
  ownerId: "all",
  teamId: "all",
  myOnly: false,
};

export function GoalsTreeView({
  goals,
  snapshotMap,
  users,
  teams,
  templates,
  currentUserRole,
  currentUserId,
  presets,
  presetItemsByPreset,
}: GoalsTreeViewProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editNode, setEditNode] = useState<GoalNode | null>(null);
  const [filter, setFilter] = useState<FilterState>(initialFilter);
  const [tab, setTab] = useState<"tree" | "attention" | "achieved">("tree");
  // When the user clicks "複製" on an existing goal we pre-fill the
  // create dialog with that goal's values (period shifted by +1 month,
  // name suffixed with "(コピー)") instead of creating a separate path.
  const [createDefaults, setCreateDefaults] = useState<GoalNode | null>(null);

  // Computed once per render — `now` is recreated each render, but the
  // tree only rebuilds when goals/snapshots change in practice since
  // React keeps the same reference until props change.
  const now = useMemo(() => new Date(), []);
  const tree = useMemo(
    () => buildTree(goals, snapshotMap, now),
    [goals, snapshotMap, now]
  );
  const flat = useMemo(() => flattenTree(tree), [tree]);

  const canCreate =
    currentUserRole === "super_admin" ||
    currentUserRole === "admin" ||
    currentUserRole === "manager";

  // Apply filters to the flat list. For the tree view, we re-include any
  // ancestor of a matched node so the hierarchy stays intelligible.
  const filteredFlat = useMemo(() => {
    return flat.filter((n) => {
      if (filter.search) {
        const q = filter.search.toLowerCase();
        if (!n.name.toLowerCase().includes(q)) return false;
      }
      if (filter.level !== "all" && n.level !== filter.level) return false;
      if (filter.status !== "all" && n.statusInfo.status !== filter.status)
        return false;
      if (filter.ownerId !== "all" && n.owner_id !== filter.ownerId)
        return false;
      if (filter.teamId !== "all" && n.team_id !== filter.teamId) return false;
      if (filter.myOnly && n.owner_id !== currentUserId) return false;
      return true;
    });
  }, [flat, filter, currentUserId]);

  const visibleIds = useMemo(() => {
    const ids = new Set<string>();
    for (const n of filteredFlat) {
      ids.add(n.id);
      // Walk up to root so the filtered node has its ancestor chain
      let p = n.parent_id;
      const byId = new Map(flat.map((x) => [x.id, x]));
      while (p) {
        ids.add(p);
        p = byId.get(p)?.parent_id ?? null;
      }
    }
    return ids;
  }, [filteredFlat, flat]);

  const filteredTree = useMemo(() => {
    const prune = (nodes: GoalNode[]): GoalNode[] =>
      nodes
        .filter((n) => visibleIds.has(n.id))
        .map((n) => ({ ...n, children: prune(n.children) }));
    return prune(tree);
  }, [tree, visibleIds]);

  const attentionList = useMemo(
    () =>
      filteredFlat
        .filter((n) =>
          ["at_risk", "behind", "missed", "not_started"].includes(
            n.statusInfo.status
          )
        )
        .sort((a, b) => a.statusInfo.paceDelta - b.statusInfo.paceDelta),
    [filteredFlat]
  );

  const achievedList = useMemo(
    () =>
      filteredFlat
        .filter((n) => n.statusInfo.status === "achieved")
        .sort(
          (a, b) =>
            (b.snapshot ? Number(b.snapshot.progress_rate) : 0) -
            (a.snapshot ? Number(a.snapshot.progress_rate) : 0)
        ),
    [filteredFlat]
  );

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
      kpi_field_key: parseOptionalSelect(formData, "kpi_field_key"),
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
        // Send "" (instead of undefined) on edit so the server treats
        // "集計しない" as an explicit clear rather than "leave unchanged".
        kpi_field_key: parseOptionalSelect(formData, "kpi_field_key") ?? "",
        template_id: parseOptionalSelect(formData, "template_id") ?? "",
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

      <KpiSourceSection
        templates={templates}
        defaultTemplateId={defaults?.template_id ?? null}
        defaultKpiFieldKey={defaults?.kpi_field_key ?? null}
      />

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

  const filtersActive =
    filter.search !== "" ||
    filter.level !== "all" ||
    filter.status !== "all" ||
    filter.ownerId !== "all" ||
    filter.teamId !== "all" ||
    filter.myOnly;

  const renderFlatList = (list: GoalNode[], emptyMessage: string) => {
    if (list.length === 0) {
      return (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          {emptyMessage}
        </div>
      );
    }
    return list.map((node) => (
      <GoalNodeRow
        key={node.id}
        node={{ ...node, children: [] }}
        depth={0}
        users={users}
        teams={teams}
        onDelete={handleDelete}
        onEdit={setEditNode}
        canEdit={canCreate}
        initiallyExpanded={false}
      />
    ));
  };

  return (
    <>
      {/* KPI Summary */}
      <SummaryCards nodes={flat} />

      {/* Filter bar */}
      <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter.search}
              onChange={(e) =>
                setFilter((f) => ({ ...f, search: e.target.value }))
              }
              placeholder="目標名で検索..."
              className="h-9 pl-8"
            />
          </div>

          <Select
            value={filter.level}
            onValueChange={(v) =>
              setFilter((f) => ({ ...f, level: v as FilterState["level"] }))
            }
          >
            <SelectTrigger className="h-9 w-[120px]">
              <SelectValue placeholder="レベル" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全レベル</SelectItem>
              <SelectItem value="company">会社</SelectItem>
              <SelectItem value="department">部門</SelectItem>
              <SelectItem value="team">チーム</SelectItem>
              <SelectItem value="individual">個人</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filter.status}
            onValueChange={(v) =>
              setFilter((f) => ({ ...f, status: v as FilterState["status"] }))
            }
          >
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="ステータス" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全ステータス</SelectItem>
              <SelectItem value="achieved">達成</SelectItem>
              <SelectItem value="ahead">先行</SelectItem>
              <SelectItem value="on_track">順調</SelectItem>
              <SelectItem value="behind">遅延</SelectItem>
              <SelectItem value="at_risk">要注意</SelectItem>
              <SelectItem value="not_started">未着手</SelectItem>
              <SelectItem value="missed">未達成</SelectItem>
              <SelectItem value="upcoming">開始前</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filter.teamId}
            onValueChange={(v) =>
              setFilter((f) => ({ ...f, teamId: v as FilterState["teamId"] }))
            }
          >
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="チーム" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全チーム</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filter.ownerId}
            onValueChange={(v) =>
              setFilter((f) => ({ ...f, ownerId: v as FilterState["ownerId"] }))
            }
          >
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="担当者" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全担当者</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={() => setFilter((f) => ({ ...f, myOnly: !f.myOnly }))}
            className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
              filter.myOnly
                ? "border-primary bg-primary text-white"
                : "border-border bg-white text-foreground hover:bg-muted"
            }`}
          >
            <UserIcon className="h-3.5 w-3.5" />
            自分の担当のみ
          </button>

          {filtersActive && (
            <button
              type="button"
              onClick={() => setFilter(initialFilter)}
              className="flex h-9 items-center gap-1 rounded-lg border border-border bg-white px-3 text-xs text-muted-foreground hover:text-danger"
            >
              <X className="h-3.5 w-3.5" />
              クリア
            </button>
          )}

          {canCreate && (
            <div className="flex items-center gap-2">
              <BulkCreateDialog
                presets={presets}
                itemsByPreset={presetItemsByPreset}
                users={users}
                teams={teams}
              />
              <Link
                href="/goals/presets"
                className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 px-2 py-1"
                title="プリセット管理"
              >
                <Settings className="h-3.5 w-3.5" />
                プリセット
              </Link>
            <Dialog
              open={createDialogOpen}
              onOpenChange={(open) => {
                setCreateDialogOpen(open);
                if (!open) setCreateDefaults(null);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="ml-auto h-9 bg-primary hover:bg-primary/90"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  目標作成
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {createDefaults ? "目標を複製して作成" : "目標作成"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  {goalFormFields(createDefaults)}
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
            </div>
          )}
        </div>

        {filtersActive && (
          <div className="mt-2 text-xs text-muted-foreground">
            {filteredFlat.length} / {flat.length} 件を表示中
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as typeof tab)}
        className="space-y-3"
      >
        <TabsList>
          <TabsTrigger value="tree" className="gap-1.5">
            <ListTree className="h-4 w-4" />
            ツリー
          </TabsTrigger>
          <TabsTrigger value="attention" className="gap-1.5">
            <AlertOctagon className="h-4 w-4" />
            要対応
            {attentionList.length > 0 && (
              <span className="ml-1 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">
                {attentionList.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="achieved" className="gap-1.5">
            <Trophy className="h-4 w-4" />
            達成
            {achievedList.length > 0 && (
              <span className="ml-1 rounded-full bg-success px-1.5 py-0.5 text-[10px] font-bold text-white">
                {achievedList.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tree" className="m-0">
          <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <div className="hidden items-center gap-3 border-b border-border bg-stone-50 px-3 py-2 pl-5 text-[11px] font-medium text-muted-foreground md:flex">
              <span className="w-5" />
              <span className="w-8" />
              <span className="flex-1">目標 / 担当 / 期間</span>
              <span className="w-56 text-center">進捗 vs 期間経過</span>
              <span className="w-24 text-right">実績 / 目標</span>
              <span className="w-12" />
            </div>
            {filteredTree.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Target className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                {filtersActive
                  ? "条件に一致する目標がありません"
                  : "目標がまだ作成されていません"}
              </div>
            ) : (
              filteredTree.map((node) => (
                <GoalNodeRow
                  key={node.id}
                  node={node}
                  depth={0}
                  users={users}
                  teams={teams}
                  onDelete={handleDelete}
                  onEdit={setEditNode}
                  canEdit={canCreate}
                  initiallyExpanded={true}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="attention" className="m-0">
          <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <div className="border-b border-border bg-danger/5 px-4 py-2.5 text-xs text-danger">
              <span className="font-semibold">期間経過に対して進捗が遅れている目標</span>
              <span className="ml-2 text-muted-foreground">
                ペース差が大きい順に表示
              </span>
            </div>
            {renderFlatList(
              attentionList,
              "対応が必要な目標はありません 🎉"
            )}
          </div>
        </TabsContent>

        <TabsContent value="achieved" className="m-0">
          <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <div className="border-b border-border bg-success/5 px-4 py-2.5 text-xs text-success">
              <span className="font-semibold">達成済みの目標</span>
            </div>
            {renderFlatList(achievedList, "達成済みの目標はまだありません")}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editNode} onOpenChange={(open) => !open && setEditNode(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              目標を編集
            </DialogTitle>
          </DialogHeader>

          {editNode && (
            <>
              {/* Progress summary */}
              <div className="space-y-3 rounded-lg border border-border bg-muted p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      現在の進捗
                    </span>
                    <StatusBadge status={editNode.statusInfo.status} />
                  </div>
                  <span className="font-mono text-lg font-bold text-primary">
                    {editNode.snapshot
                      ? `${Number(editNode.snapshot.progress_rate).toFixed(1)}%`
                      : "0.0%"}
                  </span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="absolute top-0 z-10 h-full w-px bg-foreground/40"
                    style={{
                      left: `${Math.min(editNode.statusInfo.elapsedRate, 100)}%`,
                    }}
                  />
                  <div
                    className={`h-full rounded-full transition-all ${goalStatusStyles[editNode.statusInfo.status].bar}`}
                    style={{
                      width: `${Math.min(editNode.snapshot ? Number(editNode.snapshot.progress_rate) : 0, 100)}%`,
                    }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">実績 / 目標</div>
                    <div className="font-mono font-medium text-foreground">
                      {editNode.snapshot
                        ? Number(editNode.snapshot.actual_value)
                        : 0}{" "}
                      / {Number(editNode.target_value)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">期間経過</div>
                    <div className="font-mono font-medium text-foreground">
                      {editNode.statusInfo.elapsedRate.toFixed(0)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">残日数</div>
                    <div
                      className={`font-mono font-medium ${
                        editNode.statusInfo.daysRemaining < 0
                          ? "text-muted-foreground"
                          : editNode.statusInfo.daysRemaining <= 3
                            ? "text-danger"
                            : editNode.statusInfo.daysRemaining <= 7
                              ? "text-warning"
                              : "text-foreground"
                      }`}
                    >
                      {editNode.statusInfo.daysRemaining < 0
                        ? "終了"
                        : `${editNode.statusInfo.daysRemaining}日`}
                    </div>
                  </div>
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
                    <Trash2 className="mr-1 h-4 w-4" />
                    削除
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCreateDefaults(buildDuplicateDefaults(editNode));
                        setEditNode(null);
                        setCreateDialogOpen(true);
                      }}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      複製
                    </Button>
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
