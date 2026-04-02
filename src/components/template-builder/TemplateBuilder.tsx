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
import { Plus, Settings2 } from "lucide-react";
import type {
  FieldType,
  TemplateField,
  TemplateSchema,
  TemplateSection,
  TemplateType,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { FieldPalette } from "./FieldPalette";
import { FieldProperties } from "./FieldProperties";
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
  file: "ファイル",
  link: "リンク",
  section: "セクション",
  repeater: "リピーター",
};

interface TemplateBuilderProps {
  initialSchema?: TemplateSchema;
  templateName: string;
  templateType: TemplateType;
  onSave: (schema: TemplateSchema) => void;
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
  const [propertiesOpen, setPropertiesOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Find the selected field across all sections
  const selectedField = useMemo(() => {
    if (!selectedFieldKey) return null;
    for (const section of sections) {
      const found = section.fields.find((f) => f.key === selectedFieldKey);
      if (found) return found;
    }
    return null;
  }, [sections, selectedFieldKey]);

  // Add a new section
  const handleAddSection = useCallback(() => {
    const newSection: TemplateSection = {
      id: generateSectionId(),
      label: `セクション ${sections.length + 1}`,
      fields: [],
    };
    setSections((prev) => [...prev, newSection]);
  }, [sections.length]);

  // Add a field to the last section (or create one if none exists)
  const handleAddField = useCallback(
    (type: FieldType) => {
      const newField: TemplateField = {
        key: generateFieldKey(),
        type,
        label: DEFAULT_FIELD_LABELS[type],
        required: false,
        ...(type === "select_single" || type === "select_multi"
          ? { options: [] }
          : {}),
        ...(type === "rating" ? { min: 1, max: 5 } : {}),
        ...(type === "repeater" ? { fields: [] } : {}),
      };

      setSections((prev) => {
        if (prev.length === 0) {
          return [
            {
              id: generateSectionId(),
              label: "セクション 1",
              fields: [newField],
            },
          ];
        }
        return prev.map((section, idx) =>
          idx === prev.length - 1
            ? { ...section, fields: [...section.fields, newField] }
            : section
        );
      });

      setSelectedFieldKey(newField.key);
    },
    []
  );

  // Add field to a specific section
  const handleAddFieldToSection = useCallback(
    (sectionId: string, type: FieldType) => {
      const newField: TemplateField = {
        key: generateFieldKey(),
        type,
        label: DEFAULT_FIELD_LABELS[type],
        required: false,
        ...(type === "select_single" || type === "select_multi"
          ? { options: [] }
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

  // Delete the selected field
  const handleDeleteField = useCallback(() => {
    if (!selectedFieldKey) return;
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        fields: section.fields.filter((f) => f.key !== selectedFieldKey),
      }))
    );
    setSelectedFieldKey(null);
    setPropertiesOpen(false);
  }, [selectedFieldKey]);

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

  // Sync sections to parent on every change
  useEffect(() => {
    onSave({ sections });
  }, [sections, onSave]);

  // Select field and open properties on mobile
  const handleSelectField = useCallback((key: string) => {
    setSelectedFieldKey(key);
    setPropertiesOpen(true);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-primary">
            {templateName}
          </h2>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-primary">
            {TEMPLATE_TYPE_LABELS[templateType]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile: properties toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPropertiesOpen(true)}
            className="lg:hidden"
          >
            <Settings2 className="mr-1 h-4 w-4" />
            設定
          </Button>
        </div>
      </div>

      {/* Tabs: Builder / Preview */}
      <Tabs defaultValue="builder" className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-border px-4 pt-2">
          <TabsList>
            <TabsTrigger value="builder">ビルダー</TabsTrigger>
            <TabsTrigger value="preview">プレビュー</TabsTrigger>
          </TabsList>
        </div>

        {/* Builder Tab */}
        <TabsContent value="builder" className="flex-1 overflow-hidden m-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="flex h-full">
              {/* Left Panel - Field Palette */}
              <div className="hidden w-56 shrink-0 overflow-y-auto border-r border-border p-3 md:block">
                <FieldPalette onAddField={handleAddField} />
              </div>

              {/* Center - Builder Area */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Mobile: Field Palette inline */}
                <div className="mb-4 md:hidden">
                  <FieldPalette onAddField={handleAddField} />
                </div>

                <div className="mx-auto max-w-2xl space-y-4">
                  {sections.map((section) => (
                    <SectionBlock
                      key={section.id}
                      section={section}
                      fields={section.fields}
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
                    />
                  ))}

                  {sections.length === 0 && (
                    <div className="rounded-lg border-2 border-dashed border-border px-4 py-12 text-center">
                      <p className="mb-2 text-sm text-muted-foreground">
                        まだセクションがありません
                      </p>
                      <p className="text-xs text-muted-foreground">
                        下のボタンでセクションを追加するか、左パネルからフィールドを追加してください
                      </p>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddSection}
                    className="w-full"
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    セクション追加
                  </Button>
                </div>
              </div>

              {/* Right Panel - Field Properties (desktop) */}
              <div className="hidden w-72 shrink-0 overflow-y-auto border-l border-border p-3 lg:block">
                <FieldProperties
                  field={selectedField}
                  onUpdate={handleUpdateField}
                  onDelete={handleDeleteField}
                />
              </div>
            </div>
          </DndContext>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="flex-1 overflow-y-auto m-0 p-4">
          <div className="mx-auto max-w-2xl space-y-6">
            {sections.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-border px-4 py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  フィールドを追加するとプレビューが表示されます
                </p>
              </div>
            ) : (
              sections.map((section) => (
                <div key={section.id} className="space-y-4">
                  <h3 className="text-base font-semibold text-primary">
                    {section.label}
                  </h3>
                  <div className="space-y-4 rounded-lg border border-border bg-white p-4">
                    {section.fields.map((field) => (
                      <FieldRenderer
                        key={field.key}
                        field={field}
                        mode="preview"
                      />
                    ))}
                    {section.fields.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        フィールドがありません
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Mobile: Field Properties as Sheet */}
      <Sheet open={propertiesOpen} onOpenChange={setPropertiesOpen}>
        <SheetContent side="right" className="w-80 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>フィールド設定</SheetTitle>
            <SheetDescription>
              選択したフィールドのプロパティを編集します
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <FieldProperties
              field={selectedField}
              onUpdate={handleUpdateField}
              onDelete={handleDeleteField}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
