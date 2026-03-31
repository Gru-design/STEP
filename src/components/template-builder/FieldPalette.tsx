"use client";

import {
  Type,
  AlignLeft,
  Hash,
  ChevronDown,
  CheckSquare,
  Calendar,
  Star,
  Paperclip,
  Link,
  LayoutList,
  Repeat,
} from "lucide-react";
import type { FieldType } from "@/types/database";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface FieldTypeConfig {
  type: FieldType;
  icon: LucideIcon;
  label: string;
}

const FIELD_TYPES: FieldTypeConfig[] = [
  { type: "text", icon: Type, label: "テキスト" },
  { type: "textarea", icon: AlignLeft, label: "テキストエリア" },
  { type: "number", icon: Hash, label: "数値" },
  { type: "select_single", icon: ChevronDown, label: "単一選択" },
  { type: "select_multi", icon: CheckSquare, label: "複数選択" },
  { type: "date", icon: Calendar, label: "日付" },
  { type: "rating", icon: Star, label: "評価" },
  { type: "file", icon: Paperclip, label: "ファイル" },
  { type: "link", icon: Link, label: "リンク" },
  { type: "section", icon: LayoutList, label: "セクション" },
  { type: "repeater", icon: Repeat, label: "リピーター" },
];

interface FieldPaletteProps {
  onAddField: (type: FieldType) => void;
}

export function FieldPalette({ onAddField }: FieldPaletteProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-primary">フィールド</h3>
      <div className="grid grid-cols-2 gap-2">
        {FIELD_TYPES.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => onAddField(type)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border border-border bg-white p-3",
              "text-foreground transition-colors",
              "hover:border-accent-color hover:bg-muted hover:text-accent-color",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
