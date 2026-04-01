"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SelectItem,
} from "@/components/ui/select";
import { OptionalSelect } from "@/components/shared/OptionalSelect";
import { Plus, Trash2, Star, ChevronDown, Check } from "lucide-react";
import type {
  TemplateSchema,
  TemplateSection,
  TemplateField,
} from "@/types/database";

interface DynamicFormProps {
  schema: TemplateSchema;
  values: Record<string, unknown>;
  onChange?: (values: Record<string, unknown>) => void;
  readOnly?: boolean;
}

export function DynamicForm({
  schema,
  values,
  onChange,
  readOnly = false,
}: DynamicFormProps) {
  const setValue = (key: string, value: unknown) => {
    onChange?.({ ...values, [key]: value });
  };

  return (
    <div className="space-y-6">
      {schema.sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          totalSections={schema.sections.length}
          values={values}
          setValue={setValue}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}

function SectionRenderer({
  section,
  totalSections,
  values,
  setValue,
  readOnly,
}: {
  section: TemplateSection;
  totalSections: number;
  values: Record<string, unknown>;
  setValue: (key: string, value: unknown) => void;
  readOnly: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Calculate section completion
  const sectionFields = section.fields.filter((f) => f.type !== "section");
  const filledCount = sectionFields.filter((f) => {
    const val = values[f.key];
    return val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0);
  }).length;
  const isComplete = filledCount === sectionFields.length && sectionFields.length > 0;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => !readOnly && totalSections > 1 && setIsCollapsed(!isCollapsed)}
        className={`flex w-full items-center justify-between ${
          !readOnly && totalSections > 1 ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-primary">
            {section.label}
          </h3>
          {!readOnly && sectionFields.length > 0 && (
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              isComplete
                ? "bg-success/10 text-success"
                : "bg-muted text-muted-foreground"
            }`}>
              {isComplete ? (
                <><Check className="h-3 w-3" /> 完了</>
              ) : (
                `${filledCount}/${sectionFields.length}`
              )}
            </span>
          )}
        </div>
        {!readOnly && totalSections > 1 && (
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground motion-safe:transition-transform ${
              isCollapsed ? "-rotate-90" : ""
            }`}
          />
        )}
      </button>
      <Separator />
      {!isCollapsed && (
        <div className="space-y-4">
          {section.fields.map((field) => (
            <FieldRenderer
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(val) => setValue(field.key, val)}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: TemplateField;
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly: boolean;
}) {
  if (field.type === "section") {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">
        {field.label}
        {field.required && <span className="ml-1 text-danger">*</span>}
      </Label>
      {renderField(field, value, onChange, readOnly)}
    </div>
  );
}

function renderField(
  field: TemplateField,
  value: unknown,
  onChange: (value: unknown) => void,
  readOnly: boolean
): React.ReactNode {
  if (readOnly) {
    return <ReadOnlyValue field={field} value={value} />;
  }

  switch (field.type) {
    case "text":
      return (
        <Input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="border-border"
        />
      );

    case "textarea":
      return (
        <Textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className="border-border"
        />
      );

    case "number":
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            value={(value as number) ?? ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            className="border-border font-mono"
          />
          {field.unit && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {field.unit}
            </span>
          )}
        </div>
      );

    case "select_single":
      return (
        <OptionalSelect
          value={(value as string) || null}
          onValueChange={(v) => onChange(v ?? "")}
          placeholder={field.placeholder ?? "選択してください"}
          noneLabel="未選択"
        >
          {(field.options ?? []).map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </OptionalSelect>
      );

    case "select_multi":
      return (
        <MultiCheckbox
          options={field.options ?? []}
          value={(value as string[]) ?? []}
          onChange={onChange}
        />
      );

    case "date":
      return (
        <Input
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="border-border"
        />
      );

    case "rating":
      return (
        <RatingInput
          value={(value as number) ?? 0}
          onChange={onChange}
          max={field.max ?? 5}
        />
      );

    case "file":
      return (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4">
          <Input
            type="file"
            onChange={() => {}}
            className="border-0 p-0"
          />
        </div>
      );

    case "link":
      return (
        <Input
          type="url"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? "https://"}
          className="border-border"
        />
      );

    case "repeater":
      return (
        <RepeaterField
          field={field}
          value={(value as Record<string, unknown>[]) ?? []}
          onChange={onChange}
        />
      );

    default:
      return null;
  }
}

function ReadOnlyValue({
  field,
  value,
}: {
  field: TemplateField;
  value: unknown;
}) {
  if (value === null || value === undefined || value === "") {
    return <p className="text-sm text-muted-foreground">--</p>;
  }

  switch (field.type) {
    case "rating": {
      const rating = value as number;
      return (
        <div className="flex items-center gap-1">
          {Array.from({ length: field.max ?? 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-5 w-5 ${
                i < rating
                  ? "fill-warning text-warning"
                  : "text-slate-200"
              }`}
            />
          ))}
          <span className="ml-2 text-sm font-mono text-foreground">
            {rating}/{field.max ?? 5}
          </span>
        </div>
      );
    }

    case "select_multi": {
      const items = Array.isArray(value) ? (value as string[]) : [];
      if (items.length === 0) {
        return <p className="text-sm text-muted-foreground">--</p>;
      }
      return (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item}
              className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-primary"
            >
              {item}
            </span>
          ))}
        </div>
      );
    }

    case "textarea":
      return (
        <p className="text-sm text-foreground whitespace-pre-wrap">
          {value as string}
        </p>
      );

    case "number":
      return (
        <p className="text-sm font-mono text-foreground">
          {value as number}
          {field.unit && (
            <span className="ml-1 text-muted-foreground">{field.unit}</span>
          )}
        </p>
      );

    case "link":
      return (
        <a
          href={value as string}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-accent-color underline break-all"
        >
          {value as string}
        </a>
      );

    case "repeater": {
      const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
      if (rows.length === 0) {
        return <p className="text-sm text-muted-foreground">--</p>;
      }
      return (
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div
              key={i}
              className="rounded-lg border border-border p-3 space-y-1"
            >
              {field.fields?.map((childField) => (
                <div key={childField.key} className="flex items-baseline gap-2">
                  <span className="text-xs text-muted-foreground">
                    {childField.label}:
                  </span>
                  <span className="text-sm text-foreground">
                    {String(row[childField.key] ?? "--")}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    default:
      return <p className="text-sm text-foreground">{String(value)}</p>;
  }
}

function MultiCheckbox({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (value: unknown) => void;
}) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm motion-safe:transition-all ${
              selected
                ? "border-primary/30 bg-primary/5 text-primary font-medium"
                : "border-border bg-white text-foreground hover:border-primary/20 hover:bg-muted"
            }`}
          >
            <div className={`flex h-4 w-4 items-center justify-center rounded border ${
              selected
                ? "border-primary bg-primary text-white"
                : "border-border"
            }`}>
              {selected && <Check className="h-3 w-3" />}
            </div>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function RatingInput({
  value,
  onChange,
  max,
}: {
  value: number;
  onChange: (value: unknown) => void;
  max: number;
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => {
        const starValue = i + 1;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(starValue === value ? 0 : starValue)}
            className="rounded p-1 motion-safe:transition-colors hover:bg-muted active:scale-90"
          >
            <Star
              className={`h-7 w-7 sm:h-6 sm:w-6 ${
                i < value
                  ? "fill-warning text-warning"
                  : "text-slate-200 hover:text-warning/50"
              }`}
            />
          </button>
        );
      })}
      <span className="ml-2 text-sm font-mono text-muted-foreground">
        {value}/{max}
      </span>
    </div>
  );
}

function RepeaterField({
  field,
  value,
  onChange,
}: {
  field: TemplateField;
  value: Record<string, unknown>[];
  onChange: (value: unknown) => void;
}) {
  const childFields = field.fields ?? [];

  const addRow = () => {
    const emptyRow: Record<string, unknown> = {};
    childFields.forEach((f) => {
      emptyRow[f.key] = "";
    });
    onChange([...value, emptyRow]);
  };

  const removeRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, key: string, val: unknown) => {
    const updated = [...value];
    updated[index] = { ...updated[index], [key]: val };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {value.map((row, index) => (
        <div
          key={index}
          className="rounded-lg border border-border p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              #{index + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeRow(index)}
              className="h-7 w-7 p-0 text-danger hover:text-danger hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {childFields.map((childField) => (
            <div key={childField.key} className="space-y-1.5">
              <Label className="text-sm text-foreground">
                {childField.label}
                {childField.required && (
                  <span className="ml-1 text-danger">*</span>
                )}
              </Label>
              {renderField(
                childField,
                row[childField.key],
                (val) => updateRow(index, childField.key, val),
                false
              )}
            </div>
          ))}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        className="border-border"
      >
        <Plus className="mr-1 h-4 w-4" />
        行を追加
      </Button>
    </div>
  );
}
