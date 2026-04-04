"use client";

import { Plus, Trash2, X } from "lucide-react";
import type { TemplateField } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface InlineFieldPropertiesProps {
  field: TemplateField;
  onUpdate: (field: TemplateField) => void;
  onDelete: () => void;
}

export function InlineFieldProperties({
  field,
  onUpdate,
  onDelete,
}: InlineFieldPropertiesProps) {
  const update = (partial: Partial<TemplateField>) => {
    onUpdate({ ...field, ...partial });
  };

  const showUnit = field.type === "number";
  const showMinMax = field.type === "number" || field.type === "rating";
  const showOptions =
    field.type === "select_single" || field.type === "select_multi";
  const showPlaceholder =
    field.type === "text" ||
    field.type === "textarea" ||
    field.type === "number" ||
    field.type === "link";

  return (
    <div className="space-y-3">
      {/* Row 1: Label + Required */}
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">
            ラベル
          </Label>
          <Input
            value={field.label}
            onChange={(e) => update({ label: e.target.value })}
            className="h-8 text-sm"
            placeholder="フィールド名"
          />
        </div>
        <label className="flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground select-none cursor-pointer hover:bg-muted motion-safe:transition-colors">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => update({ required: e.target.checked })}
            className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-ring"
          />
          <span className="text-xs">必須</span>
        </label>
      </div>

      {/* Row 2: Placeholder (when applicable) */}
      {showPlaceholder && (
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">
            プレースホルダー
          </Label>
          <Input
            value={field.placeholder ?? ""}
            onChange={(e) =>
              update({ placeholder: e.target.value || undefined })
            }
            placeholder="入力ヒントを設定"
            className="h-8 text-sm"
          />
        </div>
      )}

      {/* Row 3: Unit + Min/Max for number/rating */}
      {(showUnit || showMinMax) && (
        <div className="flex items-end gap-2">
          {showUnit && (
            <div className="flex-1 space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">
                単位
              </Label>
              <Input
                value={field.unit ?? ""}
                onChange={(e) =>
                  update({ unit: e.target.value || undefined })
                }
                placeholder="件、円、%"
                className="h-8 text-sm"
              />
            </div>
          )}
          {showMinMax && (
            <>
              <div className="w-20 space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  最小値
                </Label>
                <Input
                  type="number"
                  value={field.min ?? ""}
                  onChange={(e) =>
                    update({
                      min: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="w-20 space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  最大値
                </Label>
                <Input
                  type="number"
                  value={field.max ?? ""}
                  onChange={(e) =>
                    update({
                      max: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="h-8 text-sm"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Row 4: Cumulative display toggle for number fields */}
      {field.type === "number" && (
        <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground select-none cursor-pointer hover:bg-muted motion-safe:transition-colors">
          <input
            type="checkbox"
            checked={field.show_cumulative ?? false}
            onChange={(e) => update({ show_cumulative: e.target.checked || undefined })}
            className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-ring"
          />
          <span className="text-xs">当月累計を表示</span>
          <span className="text-[10px] text-muted-foreground">
            日報入力時に今月の累計値を自動表示します
          </span>
        </label>
      )}

      {/* Options for select fields */}
      {showOptions && (
        <div className="space-y-2">
          <Label className="text-[11px] font-medium text-muted-foreground">
            選択肢
          </Label>
          <div className="space-y-1.5">
            {(field.options ?? []).map((option, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                  {index + 1}
                </span>
                <Input
                  value={option}
                  onChange={(e) => {
                    const updated = [...(field.options ?? [])];
                    updated[index] = e.target.value;
                    update({ options: updated });
                  }}
                  className="h-8 flex-1 text-sm"
                  placeholder={`選択肢 ${index + 1}`}
                  autoFocus={option === "" && index === (field.options ?? []).length - 1}
                />
                <button
                  type="button"
                  onClick={() => {
                    const updated = (field.options ?? []).filter(
                      (_, i) => i !== index
                    );
                    update({ options: updated });
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground motion-safe:transition-colors hover:bg-danger/10 hover:text-danger"
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
            className="h-8 w-full border-dashed text-xs"
          >
            <Plus className="mr-1 h-3 w-3" />
            選択肢を追加
          </Button>
        </div>
      )}

      {/* Delete button */}
      <div className="flex items-center justify-end pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-7 text-xs text-muted-foreground hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 className="mr-1 h-3 w-3" />
          このフィールドを削除
        </Button>
      </div>
    </div>
  );
}
