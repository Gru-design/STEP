"use client";

import { Plus, Trash2, X } from "lucide-react";
import type { TemplateField } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface FieldPropertiesProps {
  field: TemplateField | null;
  onUpdate: (field: TemplateField) => void;
  onDelete: () => void;
}

export function FieldProperties({
  field,
  onUpdate,
  onDelete,
}: FieldPropertiesProps) {
  if (!field) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">フィールドを選択してください</p>
      </div>
    );
  }

  const update = (partial: Partial<TemplateField>) => {
    onUpdate({ ...field, ...partial });
  };

  const showUnit = field.type === "number";
  const showMinMax = field.type === "number" || field.type === "rating";
  const showOptions =
    field.type === "select_single" || field.type === "select_multi";

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-primary">
        フィールド設定
      </h3>

      <Separator />

      {/* Label */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">ラベル</Label>
        <Input
          value={field.label}
          onChange={(e) => update({ label: e.target.value })}
        />
      </div>

      {/* Required */}
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => update({ required: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-accent-color focus:ring-ring"
        />
        必須フィールド
      </label>

      {/* Placeholder */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">プレースホルダー</Label>
        <Input
          value={field.placeholder ?? ""}
          onChange={(e) =>
            update({ placeholder: e.target.value || undefined })
          }
          placeholder="入力ヒント"
        />
      </div>

      {/* Unit (number only) */}
      {showUnit && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">単位</Label>
          <Input
            value={field.unit ?? ""}
            onChange={(e) => update({ unit: e.target.value || undefined })}
            placeholder="例: 件、円、%"
          />
        </div>
      )}

      {/* Min / Max */}
      {showMinMax && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">最小値</Label>
            <Input
              type="number"
              value={field.min ?? ""}
              onChange={(e) =>
                update({
                  min: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">最大値</Label>
            <Input
              type="number"
              value={field.max ?? ""}
              onChange={(e) =>
                update({
                  max: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
        </div>
      )}

      {/* Options (select) */}
      {showOptions && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">選択肢</Label>
          <div className="space-y-1.5">
            {(field.options ?? []).map((option, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <Input
                  value={option}
                  onChange={(e) => {
                    const updated = [...(field.options ?? [])];
                    updated[index] = e.target.value;
                    update({ options: updated });
                  }}
                  className="h-8 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    const updated = (field.options ?? []).filter(
                      (_, i) => i !== index
                    );
                    update({ options: updated });
                  }}
                  className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-red-50 hover:text-danger"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const updated = [...(field.options ?? []), ""];
              update({ options: updated });
            }}
            className="w-full"
          >
            <Plus className="mr-1 h-3 w-3" />
            選択肢を追加
          </Button>
        </div>
      )}

      <Separator />

      {/* Delete */}
      <Button
        type="button"
        variant="outline"
        onClick={onDelete}
        className="w-full border-danger text-danger hover:bg-red-50 hover:text-danger"
      >
        <Trash2 className="mr-1.5 h-4 w-4" />
        フィールドを削除
      </Button>
    </div>
  );
}
