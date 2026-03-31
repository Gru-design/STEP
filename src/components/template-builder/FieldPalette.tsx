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
      <h3 className="text-sm font-semibold text-[#0C025F]">フィールド</h3>
      <div className="grid grid-cols-2 gap-2">
        {FIELD_TYPES.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => onAddField(type)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-3",
              "text-[#1E293B] transition-colors",
              "hover:border-[#2563EB] hover:bg-[#F0F4FF] hover:text-[#2563EB]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C025F] focus-visible:ring-offset-2"
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
