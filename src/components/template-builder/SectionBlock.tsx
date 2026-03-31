"use client";

import { useState } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, Check } from "lucide-react";
import type { FieldType, TemplateField, TemplateSection } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FieldRenderer } from "./FieldRenderer";

interface SectionBlockProps {
  section: TemplateSection;
  fields: TemplateField[];
  selectedFieldKey: string | null;
  onSelectField: (key: string) => void;
  onUpdateSectionLabel: (label: string) => void;
  onDeleteSection: () => void;
  onAddField: (type: FieldType) => void;
}

export function SectionBlock({
  section,
  fields,
  selectedFieldKey,
  onSelectField,
  onUpdateSectionLabel,
  onDeleteSection,
}: SectionBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(section.label);

  const handleSaveLabel = () => {
    if (editLabel.trim()) {
      onUpdateSectionLabel(editLabel.trim());
    } else {
      setEditLabel(section.label);
    }
    setIsEditing(false);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      {/* Section header */}
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
        {isEditing ? (
          <div className="flex flex-1 items-center gap-1.5">
            <Input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveLabel();
                if (e.key === "Escape") {
                  setEditLabel(section.label);
                  setIsEditing(false);
                }
              }}
              className="h-7 text-sm"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveLabel}
              className="rounded p-1 text-[#059669] hover:bg-green-50"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex flex-1 items-center gap-1.5 text-left"
          >
            <span className="text-sm font-semibold text-[#0C025F]">
              {section.label}
            </span>
            <Pencil className="h-3 w-3 text-[#64748B]" />
          </button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDeleteSection}
          className="h-7 px-2 text-[#DC2626] hover:bg-red-50 hover:text-[#DC2626]"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="ml-1 text-xs">削除</span>
        </Button>
      </div>

      {/* Fields */}
      <div className="p-2">
        <SortableContext
          items={fields.map((f) => f.key)}
          strategy={verticalListSortingStrategy}
        >
          {fields.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-slate-200 px-4 py-6 text-center">
              <p className="text-sm text-[#64748B]">
                左パネルからフィールドを追加してください
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {fields.map((field) => (
                <SortableFieldItem
                  key={field.key}
                  field={field}
                  isSelected={selectedFieldKey === field.key}
                  onSelect={() => onSelectField(field.key)}
                />
              ))}
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

interface SortableFieldItemProps {
  field: TemplateField;
  isSelected: boolean;
  onSelect: () => void;
}

function SortableFieldItem({
  field,
  isSelected,
  onSelect,
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
        "flex cursor-pointer items-center rounded-lg border px-3 py-2 transition-colors",
        isSelected
          ? "border-[#2563EB] bg-[#F0F4FF]"
          : "border-transparent hover:border-slate-200 hover:bg-[#F0F4FF]",
        isDragging && "z-50 opacity-50"
      )}
      onClick={onSelect}
    >
      <button
        type="button"
        className="mr-1 shrink-0 cursor-grab touch-none rounded p-0.5 text-[#64748B] hover:text-[#1E293B]"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <FieldRenderer field={field} mode="builder" />
      </div>
    </div>
  );
}
