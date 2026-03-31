"use client";

import { Plus, Trash2 } from "lucide-react";
import type { TemplateField } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FieldRenderer } from "./FieldRenderer";

interface RepeaterFieldProps {
  field: TemplateField;
  mode: "builder" | "preview";
  value?: Record<string, unknown>[];
  onChange?: (value: Record<string, unknown>[]) => void;
}

export function RepeaterField({
  field,
  mode,
  value = [],
  onChange,
}: RepeaterFieldProps) {
  const childFields = field.fields ?? [];

  if (mode === "builder") {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-muted p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            リピーター子フィールド
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {childFields.length}件
          </Badge>
        </div>
        {childFields.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            子フィールドが定義されていません
          </p>
        ) : (
          <div className="space-y-1">
            {childFields.map((child) => (
              <div
                key={child.key}
                className="flex items-center gap-2 rounded border border-border bg-white px-2 py-1.5 text-xs text-foreground"
              >
                <span className="font-medium">{child.label}</span>
                <Badge variant="outline" className="text-[10px]">
                  {child.type}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Preview mode
  const rows = value.length > 0 ? value : [];

  const handleAddRow = () => {
    const newRow: Record<string, unknown> = {};
    childFields.forEach((f) => {
      newRow[f.key] = "";
    });
    onChange?.([...rows, newRow]);
  };

  const handleRemoveRow = (index: number) => {
    const updated = rows.filter((_, i) => i !== index);
    onChange?.(updated);
  };

  const handleCellChange = (
    rowIndex: number,
    fieldKey: string,
    cellValue: unknown
  ) => {
    const updated = rows.map((row, i) =>
      i === rowIndex ? { ...row, [fieldKey]: cellValue } : row
    );
    onChange?.(updated);
  };

  return (
    <div className="space-y-3">
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={cn(
            "rounded-lg border border-border bg-white p-3",
            "relative"
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              行 {rowIndex + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveRow(rowIndex)}
              className="h-6 px-2 text-danger hover:bg-red-50 hover:text-danger"
            >
              <Trash2 className="mr-1 h-3 w-3" />
              <span className="text-xs">削除</span>
            </Button>
          </div>
          <div className="space-y-3">
            {childFields.map((childField) => (
              <FieldRenderer
                key={childField.key}
                field={childField}
                mode="preview"
                value={row[childField.key]}
                onChange={(v) =>
                  handleCellChange(rowIndex, childField.key, v)
                }
              />
            ))}
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddRow}
        className="w-full"
      >
        <Plus className="mr-1 h-4 w-4" />
        行を追加
      </Button>
    </div>
  );
}
