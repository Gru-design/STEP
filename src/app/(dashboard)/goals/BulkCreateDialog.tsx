"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Layers, AlertCircle } from "lucide-react";
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
import { SelectItem } from "@/components/ui/select";
import { OptionalSelect } from "@/components/shared/OptionalSelect";
import { bulkCreateGoalsFromPreset } from "./actions";
import { useServerAction } from "@/hooks/useServerAction";
import type {
  GoalPreset,
  GoalPresetItem,
  User,
  Team,
} from "@/types/database";

interface BulkCreateDialogProps {
  presets: GoalPreset[];
  itemsByPreset: Record<string, GoalPresetItem[]>;
  users: Pick<User, "id" | "name" | "role">[];
  teams: Pick<Team, "id" | "name">[];
}

function firstOfMonthString(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${y}-${m}-01`;
}

function lastOfMonthString(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth();
  const last = new Date(y, m + 1, 0);
  const mm = (last.getMonth() + 1).toString().padStart(2, "0");
  const dd = last.getDate().toString().padStart(2, "0");
  return `${last.getFullYear()}-${mm}-${dd}`;
}

export function BulkCreateDialog({
  presets,
  itemsByPreset,
  users,
  teams,
}: BulkCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => new Date(), []);
  const [presetId, setPresetId] = useState<string | null>(
    presets[0]?.id ?? null
  );
  const [periodStart, setPeriodStart] = useState(firstOfMonthString(today));
  const [periodEnd, setPeriodEnd] = useState(lastOfMonthString(today));
  const [assignmentMode, setAssignmentMode] = useState<"users" | "teams">(
    "users"
  );
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  // targets[assignmentKey][itemId] = number
  const [targets, setTargets] = useState<
    Record<string, Record<string, number>>
  >({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedPreset = presetId
    ? presets.find((p) => p.id === presetId) ?? null
    : null;
  const items = presetId ? itemsByPreset[presetId] ?? [] : [];

  const ensureRow = (key: string) => {
    setTargets((prev) => {
      if (prev[key]) return prev;
      const defaults: Record<string, number> = {};
      for (const item of items) {
        defaults[item.id] = Number(item.default_target_value);
      }
      return { ...prev, [key]: defaults };
    });
  };

  const toggleOwner = (id: string) => {
    setSelectedOwnerIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      if (next.includes(id)) ensureRow(id);
      return next;
    });
  };

  const toggleTeam = (id: string) => {
    setSelectedTeamIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      if (next.includes(id)) ensureRow(id);
      return next;
    });
  };

  const updateTarget = (key: string, itemId: string, value: number) => {
    setTargets((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? {}), [itemId]: value },
    }));
  };

  const {
    execute,
    isPending,
    error: serverError,
  } = useServerAction(bulkCreateGoalsFromPreset, {
    onSuccess: () => {
      setOpen(false);
      setSelectedOwnerIds([]);
      setSelectedTeamIds([]);
      setTargets({});
      setValidationError(null);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError(null);

    if (!presetId) {
      setValidationError("プリセットを選択してください");
      return;
    }
    if (new Date(periodStart) > new Date(periodEnd)) {
      setValidationError("開始日は終了日より前に設定してください");
      return;
    }

    const assignments: {
      owner_id?: string | null;
      team_id?: string | null;
      targets: Record<string, number>;
    }[] = [];

    if (assignmentMode === "users") {
      if (selectedOwnerIds.length === 0) {
        setValidationError("担当者を1人以上選択してください");
        return;
      }
      for (const ownerId of selectedOwnerIds) {
        assignments.push({
          owner_id: ownerId,
          targets: targets[ownerId] ?? {},
        });
      }
    } else {
      if (selectedTeamIds.length === 0) {
        setValidationError("チームを1つ以上選択してください");
        return;
      }
      for (const teamId of selectedTeamIds) {
        assignments.push({
          team_id: teamId,
          targets: targets[teamId] ?? {},
        });
      }
    }

    execute({
      preset_id: presetId,
      period_start: periodStart,
      period_end: periodEnd,
      assignments,
    });
  };

  const assignmentRows: { key: string; label: string }[] =
    assignmentMode === "users"
      ? selectedOwnerIds.map((id) => ({
          key: id,
          label: users.find((u) => u.id === id)?.name ?? "不明",
        }))
      : selectedTeamIds.map((id) => ({
          key: id,
          label: teams.find((t) => t.id === id)?.name ?? "不明",
        }));

  const errorMessage = validationError ?? serverError;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={presets.length === 0}
          title={
            presets.length === 0
              ? "先にプリセットを作成してください"
              : undefined
          }
        >
          <Layers className="h-4 w-4 mr-1" />
          プリセットから一括作成
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>プリセットから目標を一括作成</DialogTitle>
        </DialogHeader>

        {presets.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted p-4 text-sm">
            <p className="text-muted-foreground mb-2">
              まだプリセットがありません。
            </p>
            <Link
              href="/goals/presets"
              className="text-primary hover:underline"
            >
              プリセット管理画面で作成する
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Preset + Period */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-1">
                <Label>プリセット</Label>
                <OptionalSelect
                  placeholder="プリセットを選択"
                  noneLabel="—"
                  value={presetId}
                  onValueChange={(v) => {
                    setPresetId(v);
                    setTargets({});
                  }}
                >
                  {presets.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </OptionalSelect>
              </div>
              <div className="space-y-2">
                <Label>期間開始</Label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>期間終了</Label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  required
                />
              </div>
            </div>

            {selectedPreset && items.length === 0 && (
              <div className="rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5" />
                このプリセットには項目が登録されていません。
              </div>
            )}

            {/* Assignment mode */}
            <div className="space-y-2">
              <Label>割り当て対象</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={assignmentMode === "users" ? "default" : "outline"}
                  onClick={() => setAssignmentMode("users")}
                  className={
                    assignmentMode === "users"
                      ? "bg-primary hover:bg-primary/90"
                      : ""
                  }
                >
                  担当者ごと
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={assignmentMode === "teams" ? "default" : "outline"}
                  onClick={() => setAssignmentMode("teams")}
                  className={
                    assignmentMode === "teams"
                      ? "bg-primary hover:bg-primary/90"
                      : ""
                  }
                >
                  チームごと
                </Button>
              </div>
            </div>

            {/* Owner / team selector */}
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground mb-2">
                {assignmentMode === "users"
                  ? "目標を持たせる担当者を選択"
                  : "目標を紐付けるチームを選択"}
              </div>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {assignmentMode === "users"
                  ? users.map((u) => {
                      const selected = selectedOwnerIds.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggleOwner(u.id)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            selected
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-foreground border-border hover:bg-muted"
                          }`}
                        >
                          {u.name}
                        </button>
                      );
                    })
                  : teams.map((t) => {
                      const selected = selectedTeamIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTeam(t.id)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            selected
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-foreground border-border hover:bg-muted"
                          }`}
                        >
                          {t.name}
                        </button>
                      );
                    })}
              </div>
            </div>

            {/* Targets grid */}
            {items.length > 0 && assignmentRows.length > 0 && (
              <div className="rounded-lg border border-border bg-white overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground sticky left-0 bg-muted z-10">
                        {assignmentMode === "users" ? "担当者" : "チーム"}
                      </th>
                      {items.map((item) => (
                        <th
                          key={item.id}
                          className="text-left px-3 py-2 font-medium text-xs text-muted-foreground whitespace-nowrap"
                        >
                          {item.name}
                          {item.kpi_field_key && (
                            <span className="ml-1 font-mono text-[10px] text-muted-foreground/70">
                              {item.kpi_field_key}
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {assignmentRows.map((row) => (
                      <tr key={row.key}>
                        <td className="px-3 py-2 text-sm sticky left-0 bg-white z-10 whitespace-nowrap">
                          {row.label}
                        </td>
                        {items.map((item) => (
                          <td key={item.id} className="px-2 py-1.5">
                            <Input
                              type="number"
                              min={0}
                              step="any"
                              value={
                                targets[row.key]?.[item.id] ??
                                Number(item.default_target_value)
                              }
                              onChange={(e) =>
                                updateTarget(
                                  row.key,
                                  item.id,
                                  Number(e.target.value)
                                )
                              }
                              className="h-9 w-24 font-mono"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-muted-foreground px-3 py-2 border-t border-border">
                  目標値を 0 にした行は作成されません。
                </p>
              </div>
            )}

            {errorMessage && (
              <p className="text-sm text-danger">{errorMessage}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={isPending || !presetId || items.length === 0}
                className="bg-primary hover:bg-primary/90"
              >
                {isPending ? "作成中..." : "目標を一括作成"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
