"use client";

import { GripVertical, Star as StarIcon, Upload } from "lucide-react";
import type { TemplateField } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { RepeaterField } from "./RepeaterField";

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "テキスト",
  textarea: "テキストエリア",
  number: "数値",
  select_single: "単一選択",
  select_multi: "複数選択",
  date: "日付",
  rating: "評価",
  file: "ファイル",
  link: "リンク",
  section: "セクション",
  repeater: "リピーター",
};

interface FieldRendererProps {
  field: TemplateField;
  mode: "builder" | "preview";
  value?: unknown;
  onChange?: (value: unknown) => void;
}

export function FieldRenderer({
  field,
  mode,
  value,
  onChange,
}: FieldRendererProps) {
  if (mode === "builder") {
    return <BuilderView field={field} />;
  }

  return <PreviewView field={field} value={value} onChange={onChange} />;
}

function BuilderView({ field }: { field: TemplateField }) {
  return (
    <div className="flex items-center gap-2">
      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm font-medium text-foreground">
          {field.label}
        </span>
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          {FIELD_TYPE_LABELS[field.type] ?? field.type}
        </Badge>
        {field.required && (
          <span className="shrink-0 text-xs font-medium text-danger">
            必須
          </span>
        )}
      </div>
    </div>
  );
}

function PreviewView({
  field,
  value,
  onChange,
}: {
  field: TemplateField;
  value?: unknown;
  onChange?: (value: unknown) => void;
}) {
  const handleChange = (v: unknown) => onChange?.(v);

  // Section type renders as a heading/divider
  if (field.type === "section") {
    return (
      <div className="pt-2">
        <h4 className="mb-1 text-sm font-semibold text-primary">
          {field.label}
        </h4>
        <Separator />
      </div>
    );
  }

  // Repeater type
  if (field.type === "repeater") {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground">
          {field.label}
          {field.required && (
            <span className="ml-1 text-danger">*</span>
          )}
        </Label>
        <RepeaterField
          field={field}
          mode="preview"
          value={value as Record<string, unknown>[] | undefined}
          onChange={handleChange as (v: Record<string, unknown>[]) => void}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">
        {field.label}
        {field.required && (
          <span className="ml-1 text-danger">*</span>
        )}
      </Label>
      {renderInput(field, value, handleChange)}
    </div>
  );
}

function renderInput(
  field: TemplateField,
  value: unknown,
  onChange: (v: unknown) => void
) {
  switch (field.type) {
    case "text":
      return (
        <Input
          placeholder={field.placeholder ?? ""}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "textarea":
      return (
        <Textarea
          placeholder={field.placeholder ?? ""}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[80px] resize-y"
        />
      );

    case "number":
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={field.placeholder ?? ""}
            value={(value as string) ?? ""}
            min={field.min}
            max={field.max}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1"
          />
          {field.unit && (
            <span className="shrink-0 text-sm text-muted-foreground">
              {field.unit}
            </span>
          )}
        </div>
      );

    case "select_single":
      return (
        <Select
          value={(value as string) ?? ""}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder ?? "選択してください"} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "select_multi": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1.5">
          {(field.options ?? []).map((opt) => {
            const checked = selected.includes(opt);
            return (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked
                      ? selected.filter((s) => s !== opt)
                      : [...selected, opt];
                    onChange(next);
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-accent-color focus:ring-ring"
                />
                {opt}
              </label>
            );
          })}
          {(field.options ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">選択肢が設定されていません</p>
          )}
        </div>
      );
    }

    case "date":
      return (
        <Input
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "rating": {
      const maxStars = field.max ?? 5;
      const current = typeof value === "number" ? value : 0;
      return (
        <div className="flex items-center gap-1">
          {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star === current ? 0 : star)}
              className="rounded p-0.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <StarIcon
                className={cn(
                  "h-6 w-6",
                  star <= current
                    ? "fill-warning text-warning"
                    : "text-slate-300"
                )}
              />
            </button>
          ))}
        </div>
      );
    }

    case "file":
      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6",
            "text-muted-foreground transition-colors hover:border-accent-color hover:bg-muted"
          )}
        >
          <Upload className="mb-2 h-8 w-8" />
          <p className="text-sm">
            ファイルをドラッグ&ドロップまたはクリックして選択
          </p>
          <input
            type="file"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onChange(file.name);
            }}
          />
        </div>
      );

    case "link":
      return (
        <Input
          type="url"
          placeholder={field.placeholder ?? "https://"}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    default:
      return null;
  }
}
