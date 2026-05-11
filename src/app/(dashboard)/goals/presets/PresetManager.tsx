"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil, Trash2, GripVertical, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OptionalSelect } from "@/components/shared/OptionalSelect";
import { getKpiCandidateFields } from "@/lib/templates/fields";
import { useServerAction } from "@/hooks/useServerAction";
import {
  createGoalPreset,
  updateGoalPreset,
  deleteGoalPreset,
} from "./actions";
import type {
  GoalPreset,
  GoalPresetItem,
  GoalLevel,
  ReportTemplate,
} from "@/types/database";

interface PresetManagerProps {
  presets: GoalPreset[];
  itemsByPreset: Record<string, GoalPresetItem[]>;
  templates: Pick<ReportTemplate, "id" | "name" | "type" | "schema">[];
}

interface DraftItem {
  id?: string;
  name: string;
  report_template_id: string | null;
  kpi_field_key: string | null;
  default_target_value: number;
}

const levelLabels: Record<GoalLevel, string> = {
  company: "会社",
  department: "部門",
  team: "チーム",
  individual: "個人",
};

function emptyDraft(): DraftItem {
  return {
    name: "",
    report_template_id: null,
    kpi_field_key: null,
    default_target_value: 0,
  };
}

export function PresetManager({
  presets,
  itemsByPreset,
  templates,
}: PresetManagerProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<GoalPreset | null>(null);

  const openCreate = () => {
    setEditingPreset(null);
    setEditorOpen(true);
  };
  const openEdit = (preset: GoalPreset) => {
    setEditingPreset(preset);
    setEditorOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/goals"
          className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          目標管理に戻る
        </Link>
        <Button
          onClick={openCreate}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-1" />
          プリセット作成
        </Button>
      </div>

      {presets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
          まだプリセットがありません。「プリセット作成」から最初のセットを作りましょう。
        </div>
      ) : (
        <div className="space-y-3">
          {presets.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              items={itemsByPreset[preset.id] ?? []}
              templates={templates}
              onEdit={() => openEdit(preset)}
            />
          ))}
        </div>
      )}

      <PresetEditorDialog
        key={editingPreset?.id ?? "new"}
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditingPreset(null);
        }}
        templates={templates}
        editingPreset={editingPreset}
        editingItems={
          editingPreset ? itemsByPreset[editingPreset.id] ?? [] : []
        }
      />
    </div>
  );
}

function PresetCard({
  preset,
  items,
  templates,
  onEdit,
}: {
  preset: GoalPreset;
  items: GoalPresetItem[];
  templates: Pick<ReportTemplate, "id" | "name">[];
  onEdit: () => void;
}) {
  const { execute: execDelete } = useServerAction(deleteGoalPreset, {
    onError: (m) => alert(m),
  });

  const templateMap = useMemo(
    () => new Map(templates.map((t) => [t.id, t])),
    [templates]
  );

  const handleDelete = () => {
    if (!confirm(`プリセット「${preset.name}」を削除しますか？`)) return;
    execDelete(preset.id);
  };

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
      <div className="flex items-start justify-between px-4 py-3 border-b border-border bg-muted/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {preset.name}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-primary-light text-primary font-medium">
              {levelLabels[preset.default_level]}
            </span>
          </div>
          {preset.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {preset.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="text-muted-foreground hover:text-primary p-1.5"
            title="編集"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={handleDelete}
            className="text-muted-foreground hover:text-danger p-1.5"
            title="削除"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="divide-y divide-border">
        {items.length === 0 ? (
          <div className="px-4 py-3 text-xs text-muted-foreground">
            項目がありません
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="px-4 py-2.5 flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <span className="text-sm text-foreground">{item.name}</span>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  {item.report_template_id ? (
                    <span>
                      {templateMap.get(item.report_template_id)?.name ??
                        "テンプレート不明"}
                      {item.kpi_field_key && (
                        <span className="font-mono ml-1">
                          / {item.kpi_field_key}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span>自動集計なし</span>
                  )}
                </div>
              </div>
              <span className="text-xs font-mono text-muted-foreground shrink-0">
                既定値 {Number(item.default_target_value)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PresetEditorDialog({
  open,
  onOpenChange,
  templates,
  editingPreset,
  editingItems,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Pick<ReportTemplate, "id" | "name" | "type" | "schema">[];
  editingPreset: GoalPreset | null;
  editingItems: GoalPresetItem[];
}) {
  const [name, setName] = useState(editingPreset?.name ?? "");
  const [description, setDescription] = useState(
    editingPreset?.description ?? ""
  );
  const [defaultLevel, setDefaultLevel] = useState<GoalLevel>(
    editingPreset?.default_level ?? "individual"
  );
  const [items, setItems] = useState<DraftItem[]>(() =>
    editingItems.length > 0
      ? editingItems.map((i) => ({
          id: i.id,
          name: i.name,
          report_template_id: i.report_template_id,
          kpi_field_key: i.kpi_field_key,
          default_target_value: Number(i.default_target_value),
        }))
      : [emptyDraft()]
  );
  const [formError, setFormError] = useState<string | null>(null);

  const {
    execute: execCreate,
    isPending: isCreating,
    error: createError,
  } = useServerAction(createGoalPreset, {
    onSuccess: () => onOpenChange(false),
  });
  const [updateState, setUpdateState] = useState<{
    isPending: boolean;
    error: string | null;
  }>({ isPending: false, error: null });

  const errorMessage = formError ?? createError ?? updateState.error;
  const isPending = isCreating || updateState.isPending;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("プリセット名を入力してください");
      return;
    }
    if (items.length === 0) {
      setFormError("項目を1件以上追加してください");
      return;
    }
    for (const item of items) {
      if (!item.name.trim()) {
        setFormError("空の項目名があります");
        return;
      }
      if (item.default_target_value < 0) {
        setFormError("既定値は0以上にしてください");
        return;
      }
      if (item.report_template_id && !item.kpi_field_key) {
        setFormError(
          `項目「${item.name}」にKPIフィールドを選択してください`
        );
        return;
      }
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      default_level: defaultLevel,
      items: items.map((it, idx) => ({
        id: it.id,
        name: it.name.trim(),
        report_template_id: it.report_template_id,
        kpi_field_key: it.kpi_field_key,
        default_target_value: Number(it.default_target_value),
        sort_order: idx,
      })),
    };

    if (editingPreset) {
      setUpdateState({ isPending: true, error: null });
      try {
        const result = await updateGoalPreset(editingPreset.id, payload);
        if (result.success) {
          onOpenChange(false);
        } else {
          setUpdateState({
            isPending: false,
            error: result.error ?? "更新に失敗しました",
          });
          return;
        }
      } catch {
        setUpdateState({
          isPending: false,
          error: "予期しないエラーが発生しました",
        });
        return;
      }
      setUpdateState({ isPending: false, error: null });
    } else {
      execCreate(payload);
    }
  };

  const addItem = () => setItems((prev) => [...prev, emptyDraft()]);
  const duplicateItem = (idx: number) =>
    setItems((prev) => {
      const next = [...prev];
      const { id: _id, ...rest } = next[idx];
      void _id;
      next.splice(idx + 1, 0, { ...rest });
      return next;
    });
  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, patch: Partial<DraftItem>) =>
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item))
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingPreset ? "プリセットを編集" : "プリセットを作成"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="preset_name">プリセット名</Label>
            <Input
              id="preset_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 営業の月次KPI"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>レベル</Label>
              <Select
                value={defaultLevel}
                onValueChange={(v) => setDefaultLevel(v as GoalLevel)}
              >
                <SelectTrigger>
                  <SelectValue />
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
              <Label htmlFor="preset_desc">説明（任意）</Label>
              <Input
                id="preset_desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例: 毎月1日に営業メンバー全員へ配布するKPIセット"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>項目</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                項目を追加
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <PresetItemRow
                  key={idx}
                  item={item}
                  templates={templates}
                  onChange={(patch) => updateItem(idx, patch)}
                  onDuplicate={() => duplicateItem(idx)}
                  onRemove={
                    items.length > 1 ? () => removeItem(idx) : undefined
                  }
                />
              ))}
            </div>
          </div>

          {errorMessage && (
            <p className="text-sm text-danger">{errorMessage}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {isPending ? "保存中..." : editingPreset ? "更新" : "作成"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PresetItemRow({
  item,
  templates,
  onChange,
  onDuplicate,
  onRemove,
}: {
  item: DraftItem;
  templates: Pick<ReportTemplate, "id" | "name" | "type" | "schema">[];
  onChange: (patch: Partial<DraftItem>) => void;
  onDuplicate: () => void;
  onRemove?: () => void;
}) {
  const selectedTemplate = item.report_template_id
    ? templates.find((t) => t.id === item.report_template_id) ?? null
    : null;
  const candidates = selectedTemplate
    ? getKpiCandidateFields(selectedTemplate.schema)
    : [];

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground mt-2.5 shrink-0" />
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2">
          <div className="md:col-span-5">
            <Input
              value={item.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="項目名 (例: 推薦数)"
              required
            />
          </div>
          <div className="md:col-span-4">
            <OptionalSelect
              placeholder="集計テンプレート"
              noneLabel="自動集計しない"
              value={item.report_template_id}
              onValueChange={(v) =>
                onChange({ report_template_id: v, kpi_field_key: null })
              }
            >
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </OptionalSelect>
          </div>
          <div className="md:col-span-3">
            <Input
              type="number"
              min={0}
              step="any"
              value={item.default_target_value}
              onChange={(e) =>
                onChange({
                  default_target_value: Number(e.target.value),
                })
              }
              placeholder="既定値"
            />
          </div>
          {item.report_template_id && (
            <div className="md:col-span-12">
              {candidates.length === 0 ? (
                <div className="rounded-lg border border-dashed border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning">
                  このテンプレートには集計可能な数値・評価フィールドがありません
                </div>
              ) : (
                <OptionalSelect
                  placeholder="KPIフィールドを選択"
                  noneLabel="集計しない"
                  value={item.kpi_field_key}
                  onValueChange={(v) => onChange({ kpi_field_key: v })}
                >
                  {candidates.map((field) => (
                    <SelectItem key={field.key} value={field.key}>
                      <span className="inline-flex items-center gap-2">
                        <span className="font-medium">{field.label}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {field.key}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </OptionalSelect>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={onDuplicate}
            className="text-muted-foreground hover:text-primary p-1"
            title="この項目を複製"
          >
            <Copy className="h-4 w-4" />
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-muted-foreground hover:text-danger p-1"
              title="削除"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

