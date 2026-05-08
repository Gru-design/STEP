"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Plus, Eye, Wrench } from "lucide-react";
import type {
  FieldType,
  TemplateField,
  TemplateSchema,
  TemplateSection,
  TemplateType,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FieldRenderer } from "./FieldRenderer";
import { SectionBlock } from "./SectionBlock";

const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  daily: "日報",
  weekly: "週報",
  plan: "週次計画",
  checkin: "チェックイン",
};

const DEFAULT_FIELD_LABELS: Record<FieldType, string> = {
  text: "テキスト",
  textarea: "テキストエリア",
  number: "数値",
  select_single: "単一選択",
  select_multi: "複数選択",
  date: "日付",
  rating: "評価",
  link: "リンク",
  section: "セクション",
  repeater: "リピーター",
};

interface TemplateBuilderProps {
  initialSchema?: TemplateSchema;
  templateName: string;
  templateType: TemplateType;
  /**
   * Called whenever the schema changes.
   *
   * `keyRenames` maps each originally-saved field key to its current key
   * within this editing session. When non-empty it lets the server-side
   * update action cascade the rename to any goals.kpi_field_key that
   * referenced the old key, so KPI tracking doesn't silently break when
   * an admin renames a field.
   */
  onSave: (
    schema: TemplateSchema,
    keyRenames: Record<string, string>
  ) => void;
}

let fieldCounter = 0;
function generateFieldKey(): string {
  fieldCounter += 1;
  return `field_${Date.now()}_${fieldCounter}`;
}

function generateSectionId(): string {
  return `section_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function TemplateBuilder({
  initialSchema,
  templateName,
  templateType,
  onSave,
}: TemplateBuilderProps) {
  const [sections, setSections] = useState<TemplateSection[]>(
    initialSchema?.sections ?? []
  );
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);

  // Snapshot the keys present when the editor first mounted. We need this
  // so we know which renames originated from a previously-saved field
  // (and therefore need to cascade to goals.kpi_field_key) versus a
  // brand-new field renamed before the first save (no cascade needed).
  const [initialKeys] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const s of initialSchema?.sections ?? []) {
      for (const f of s.fields) set.add(f.key);
    }
    return set;
  });

  // Maps each *original* field key (from initialSchema) to its current key
  // in this edit session. Empty when nothing was renamed.
  const [keyRenames, setKeyRenames] = useState<Record<string, string>>({});

  // Set of keys that exist in the current schema. Used as the sibling set
  // for uniqueness validation when renaming.
  const allTemplateKeys = useMemo(() => {
    const keys: string[] = [];
    for (const s of sections) {
      for (const f of s.fields) keys.push(f.key);
    }
    return keys;
  }, [sections]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Add a new section
  const handleAddSection = useCallback(() => {
    const newSection: TemplateSection = {
      id: generateSectionId(),
      label: `セクション ${sections.length + 1}`,
      fields: [],
    };
    setSections((prev) => [...prev, newSection]);
  }, [sections.length]);

  // Add field to a specific section
  const handleAddFieldToSection = useCallback(
    (sectionId: string, type: FieldType) => {
      const newField: TemplateField = {
        key: generateFieldKey(),
        type,
        label: DEFAULT_FIELD_LABELS[type],
        required: false,
        ...(type === "select_single" || type === "select_multi"
          ? { options: [""] }
          : {}),
        ...(type === "rating" ? { min: 1, max: 5 } : {}),
        ...(type === "repeater" ? { fields: [] } : {}),
      };

      setSections((prev) =>
        prev.map((section) =>
          section.id === sectionId
            ? { ...section, fields: [...section.fields, newField] }
            : section
        )
      );

      // Auto-select and expand the new field
      setSelectedFieldKey(newField.key);
    },
    []
  );

  // Update a field
  const handleUpdateField = useCallback(
    (updatedField: TemplateField) => {
      setSections((prev) =>
        prev.map((section) => ({
          ...section,
          fields: section.fields.map((f) =>
            f.key === updatedField.key ? updatedField : f
          ),
        }))
      );
    },
    []
  );

  // Delete a field
  const handleDeleteField = useCallback((fieldKey: string) => {
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        fields: section.fields.filter((f) => f.key !== fieldKey),
      }))
    );
    setSelectedFieldKey((prev) => (prev === fieldKey ? null : prev));
  }, []);

  // Rename a field's key. Updates the schema and records the mapping so
  // the server can cascade to any goals.kpi_field_key referencing it.
  const handleRenameFieldKey = useCallback(
    (oldKey: string, newKey: string) => {
      if (oldKey === newKey) return;

      setSections((prev) =>
        prev.map((section) => ({
          ...section,
          fields: section.fields.map((f) =>
            f.key === oldKey ? { ...f, key: newKey } : f
          ),
        }))
      );

      setKeyRenames((prev) => {
        const next = { ...prev };
        // Chain renames: if some originally-saved key already mapped to
        // oldKey, redirect that mapping to the new key.
        let chained = false;
        for (const [orig, curr] of Object.entries(next)) {
          if (curr === oldKey) {
            next[orig] = newKey;
            chained = true;
            break;
          }
        }
        // Otherwise, only track this rename if oldKey was present at
        // mount time — renames of brand-new fields don't need a cascade.
        if (!chained && initialKeys.has(oldKey)) {
          next[oldKey] = newKey;
        }
        return next;
      });

      setSelectedFieldKey((prev) => (prev === oldKey ? newKey : prev));
    },
    [initialKeys]
  );

  // Update section label
  const handleUpdateSectionLabel = useCallback(
    (sectionId: string, label: string) => {
      setSections((prev) =>
        prev.map((section) =>
          section.id === sectionId ? { ...section, label } : section
        )
      );
    },
    []
  );

  // Delete section
  const handleDeleteSection = useCallback(
    (sectionId: string) => {
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
      setSelectedFieldKey(null);
    },
    []
  );

  // Handle drag end for reordering fields within a section
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSections((prev) =>
      prev.map((section) => {
        const oldIndex = section.fields.findIndex(
          (f) => f.key === active.id
        );
        const newIndex = section.fields.findIndex(
          (f) => f.key === over.id
        );

        if (oldIndex === -1 || newIndex === -1) return section;

        return {
          ...section,
          fields: arrayMove(section.fields, oldIndex, newIndex),
        };
      })
    );
  }, []);

  // Sync sections + rename map to parent on every change (auto-save)
  useEffect(() => {
    onSave({ sections }, keyRenames);
  }, [sections, keyRenames, onSave]);

  // Toggle field selection (expand/collapse inline properties)
  const handleSelectField = useCallback((key: string) => {
    setSelectedFieldKey((prev) => (prev === key ? null : key));
  }, []);

  // Count total fields
  const totalFields = useMemo(
    () => sections.reduce((acc, s) => acc + s.fields.length, 0),
    [sections]
  );

  // Shared builder content (used in both mobile tab and desktop left pane)
  const builderContent = (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4 p-4 sm:p-6">
        {sections.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            fields={section.fields}
            allTemplateKeys={allTemplateKeys}
            selectedFieldKey={selectedFieldKey}
            onSelectField={handleSelectField}
            onUpdateSectionLabel={(label) =>
              handleUpdateSectionLabel(section.id, label)
            }
            onDeleteSection={() =>
              handleDeleteSection(section.id)
            }
            onAddField={(type) =>
              handleAddFieldToSection(section.id, type)
            }
            onUpdateField={handleUpdateField}
            onRenameFieldKey={handleRenameFieldKey}
            onDeleteField={handleDeleteField}
          />
        ))}

        {sections.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-border px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mb-1 text-sm font-medium text-foreground">
              テンプレートを作成しましょう
            </p>
            <p className="mb-4 text-xs text-muted-foreground">
              セクションを追加して、フィールドを配置してください
            </p>
            <Button
              type="button"
              onClick={handleAddSection}
              className="bg-primary text-white hover:bg-primary-hover"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              最初のセクションを追加
            </Button>
          </div>
        )}

        {sections.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={handleAddSection}
            className="w-full border-dashed"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            セクション追加
          </Button>
        )}
      </div>
    </DndContext>
  );

  // Shared preview content (used in both mobile tab and desktop right pane)
  const previewContent = (
    <div className="space-y-6">
      {sections.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            フィールドを追加するとプレビューが表示されます
          </p>
        </div>
      ) : (
        sections.map((section) => (
          <div key={section.id} className="space-y-4">
            <h3 className="text-base font-bold text-foreground">
              {section.label}
            </h3>
            <div className="space-y-5 rounded-xl border border-border bg-white p-5">
              {section.fields.map((field) => (
                <FieldRenderer
                  key={field.key}
                  field={field}
                  mode="preview"
                />
              ))}
              {section.fields.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  フィールドがありません
                </p>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-base font-bold text-foreground truncate sm:text-lg">
            {templateName}
          </h2>
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {TEMPLATE_TYPE_LABELS[templateType]}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">
            {sections.length}セクション / {totalFields}フィールド
          </span>
        </div>
      </div>

      {/* Mobile: Tab-based layout (< lg) */}
      <div className="lg:hidden">
        <Tabs defaultValue="builder" className="flex flex-1 flex-col">
          <div className="border-b border-border px-4 pt-2 sm:px-5">
            <TabsList className="h-9">
              <TabsTrigger value="builder" className="gap-1.5 text-sm">
                <Wrench className="h-3.5 w-3.5" />
                ビルダー
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-1.5 text-sm">
                <Eye className="h-3.5 w-3.5" />
                プレビュー
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="builder" className="flex-1 m-0">
            <div className="mx-auto max-w-2xl">
              {builderContent}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 m-0 p-4 sm:p-6">
            <div className="mx-auto max-w-2xl">
              {previewContent}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop: Side-by-side layout (>= lg) */}
      <div className="hidden lg:flex lg:flex-1 lg:max-h-[70vh]">
        {/* Left: Builder */}
        <div className="flex-1 min-w-0 overflow-y-auto border-r border-border">
          <div className="mx-auto max-w-2xl">
            {builderContent}
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="w-[420px] shrink-0 overflow-y-auto bg-muted/30">
          <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-border bg-white/80 backdrop-blur-sm px-5 py-2.5">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">プレビュー</span>
          </div>
          <div className="p-5">
            {previewContent}
          </div>
        </div>
      </div>
    </div>
  );
}
