"use client";

import { useState, useRef, useEffect } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Pencil,
  Trash2,
  Check,
  Plus,
  ChevronDown,
  X,
  Type,
  AlignLeft,
  Hash,
  ChevronDownIcon,
  CheckSquare,
  Calendar,
  Star,
  Link,
  LayoutList,
  Repeat,
} from "lucide-react";
import type { FieldType, TemplateField, TemplateSection } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { InlineFieldProperties } from "./FieldProperties";
import type { LucideIcon } from "lucide-react";

interface FieldTypeConfig {
  type: FieldType;
  icon: LucideIcon;
  label: string;
  description: string;
  category: "basic" | "selection" | "advanced";
}

const FIELD_TYPES: FieldTypeConfig[] = [
  { type: "text", icon: Type, label: "テキスト", description: "1行のテキスト入力", category: "basic" },
  { type: "textarea", icon: AlignLeft, label: "テキストエリア", description: "複数行のテキスト入力", category: "basic" },
  { type: "number", icon: Hash, label: "数値", description: "数値の入力（単位設定可）", category: "basic" },
  { type: "select_single", icon: ChevronDownIcon, label: "単一選択", description: "1つだけ選択", category: "selection" },
  { type: "select_multi", icon: CheckSquare, label: "複数選択", description: "複数を選択", category: "selection" },
  { type: "rating", icon: Star, label: "評価", description: "星による評価（1〜5）", category: "selection" },
  { type: "date", icon: Calendar, label: "日付", description: "日付の入力", category: "advanced" },
  { type: "link", icon: Link, label: "リンク", description: "URLの入力", category: "advanced" },
  { type: "section", icon: LayoutList, label: "見出し", description: "セクション内の区切り", category: "advanced" },
  { type: "repeater", icon: Repeat, label: "リピーター", description: "繰り返し入力フィールド", category: "advanced" },
];

const CATEGORY_LABELS: Record<string, string> = {
  basic: "基本入力",
  selection: "選択・評価",
  advanced: "その他",
};

interface SectionBlockProps {
  section: TemplateSection;
  fields: TemplateField[];
  selectedFieldKey: string | null;
  onSelectField: (key: string) => void;
  onUpdateSectionLabel: (label: string) => void;
  onDeleteSection: () => void;
  onAddField: (type: FieldType) => void;
  onUpdateField: (field: TemplateField) => void;
  onDeleteField: (fieldKey: string) => void;
}

export function SectionBlock({
  section,
  fields,
  selectedFieldKey,
  onSelectField,
  onUpdateSectionLabel,
  onDeleteSection,
  onAddField,
  onUpdateField,
  onDeleteField,
}: SectionBlockProps) {
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editLabel, setEditLabel] = useState(section.label);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  const handleSaveLabel = () => {
    if (editLabel.trim()) {
      onUpdateSectionLabel(editLabel.trim());
    } else {
      setEditLabel(section.label);
    }
    setIsEditingLabel(false);
  };

  // Close add menu on outside click
  useEffect(() => {
    if (!showAddMenu) return;
    const handler = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAddMenu]);

  const handleAddField = (type: FieldType) => {
    onAddField(type);
    setShowAddMenu(false);
  };

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      {/* Section header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        {isEditingLabel ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveLabel();
                if (e.key === "Escape") {
                  setEditLabel(section.label);
                  setIsEditingLabel(false);
                }
              }}
              className="h-8 text-sm font-medium"
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSaveLabel}
              className="h-8 w-8 p-0 text-success hover:bg-success/10"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditLabel(section.label);
                setIsEditingLabel(false);
              }}
              className="h-8 w-8 p-0 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setIsEditingLabel(true)}
              className="group flex flex-1 items-center gap-2 text-left"
            >
              <span className="text-sm font-bold text-foreground">
                {section.label}
              </span>
              <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 motion-safe:transition-opacity" />
            </button>
            <Badge variant="secondary" className="text-[10px] font-normal">
              {fields.length}項目
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDeleteSection}
              className="h-7 w-7 p-0 text-muted-foreground hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>

      {/* Fields */}
      <div className="p-3">
        <SortableContext
          items={fields.map((f) => f.key)}
          strategy={verticalListSortingStrategy}
        >
          {fields.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-border px-4 py-8 text-center">
              <p className="mb-1 text-sm text-muted-foreground">
                フィールドがまだありません
              </p>
              <p className="text-xs text-muted-foreground">
                下の「+ フィールド追加」から項目を追加してください
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {fields.map((field) => (
                <SortableFieldItem
                  key={field.key}
                  field={field}
                  isSelected={selectedFieldKey === field.key}
                  onSelect={() => onSelectField(field.key)}
                  onUpdate={onUpdateField}
                  onDelete={() => onDeleteField(field.key)}
                />
              ))}
            </div>
          )}
        </SortableContext>

        {/* Add field button with dropdown */}
        <div className="relative mt-3" ref={addMenuRef}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className={cn(
              "w-full border-dashed text-muted-foreground hover:text-primary hover:border-primary",
              showAddMenu && "border-primary text-primary bg-primary/5"
            )}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            フィールド追加
            <ChevronDown className={cn(
              "ml-auto h-3.5 w-3.5 motion-safe:transition-transform",
              showAddMenu && "rotate-180"
            )} />
          </Button>

          {/* Add field dropdown menu */}
          {showAddMenu && (
            <div className="absolute left-0 right-0 z-50 mt-1.5 rounded-xl border border-border bg-white p-3 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
              {(["basic", "selection", "advanced"] as const).map((category) => {
                const items = FIELD_TYPES.filter((f) => f.category === category);
                return (
                  <div key={category} className="mb-3 last:mb-0">
                    <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {CATEGORY_LABELS[category]}
                    </p>
                    <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                      {items.map(({ type, icon: Icon, label, description }) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleAddField(type)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-left",
                            "text-foreground motion-safe:transition-colors",
                            "hover:bg-primary/5 hover:text-primary",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <span className="block text-xs font-medium">{label}</span>
                            <span className="block text-[10px] text-muted-foreground leading-tight truncate">
                              {description}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -- Sortable Field Item with inline property editing --

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "テキスト",
  textarea: "テキストエリア",
  number: "数値",
  select_single: "単一選択",
  select_multi: "複数選択",
  date: "日付",
  rating: "評価",
  link: "リンク",
  section: "見出し",
  repeater: "リピーター",
};

const FIELD_TYPE_COLORS: Record<string, string> = {
  text: "bg-blue-50 text-blue-700",
  textarea: "bg-blue-50 text-blue-700",
  number: "bg-emerald-50 text-emerald-700",
  select_single: "bg-violet-50 text-violet-700",
  select_multi: "bg-violet-50 text-violet-700",
  date: "bg-amber-50 text-amber-700",
  rating: "bg-yellow-50 text-yellow-700",
  link: "bg-cyan-50 text-cyan-700",
  section: "bg-stone-100 text-stone-600",
  repeater: "bg-indigo-50 text-indigo-700",
};

interface SortableFieldItemProps {
  field: TemplateField;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (field: TemplateField) => void;
  onDelete: () => void;
}

function SortableFieldItem({
  field,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: SortableFieldItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border motion-safe:transition-all",
        isSelected
          ? "border-primary bg-primary/3 shadow-sm"
          : "border-border bg-white hover:border-primary/30",
        isDragging && "z-50 opacity-50 shadow-lg"
      )}
    >
      {/* Field summary row */}
      <div
        className="flex cursor-pointer items-center gap-2 px-3 py-2.5"
        onClick={onSelect}
      >
        <button
          type="button"
          className="shrink-0 cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {field.label}
          </span>
          <Badge
            variant="secondary"
            className={cn(
              "shrink-0 border-0 text-[10px] font-medium",
              FIELD_TYPE_COLORS[field.type] ?? "bg-muted text-muted-foreground"
            )}
          >
            {FIELD_TYPE_LABELS[field.type] ?? field.type}
          </Badge>
          {field.required && (
            <span className="shrink-0 text-[10px] font-bold text-danger">
              必須
            </span>
          )}
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground motion-safe:transition-transform",
            isSelected && "rotate-180 text-primary"
          )}
        />
      </div>

      {/* Inline field properties (expanded) */}
      {isSelected && (
        <div className="border-t border-border px-3 pb-3 pt-3 animate-in slide-in-from-top-1 fade-in duration-150">
          <InlineFieldProperties
            field={field}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
  );
}
