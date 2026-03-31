"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Star } from "lucide-react";
import type {
  TemplateSchema,
  TemplateSection,
  TemplateField,
} from "@/types/database";

interface DynamicFormProps {
  schema: TemplateSchema;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  readOnly?: boolean;
}

export function DynamicForm({
  schema,
  values,
  onChange,
  readOnly = false,
}: DynamicFormProps) {
  const setValue = (key: string, value: unknown) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="space-y-8">
      {schema.sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
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
  values,
  setValue,
  readOnly,
}: {
  section: TemplateSection;
  values: Record<string, unknown>;
  setValue: (key: string, value: unknown) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-[#0C025F]">
          {section.label}
        </h3>
        <Separator className="mt-2" />
      </div>
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
      <Label className="text-sm font-medium text-[#1E293B]">
        {field.label}
        {field.required && <span className="ml-1 text-[#DC2626]">*</span>}
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
          className="border-slate-200"
        />
      );

    case "textarea":
      return (
        <Textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className="border-slate-200"
        />
      );

    case "number":
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={(value as number) ?? ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            className="border-slate-200 font-mono"
          />
          {field.unit && (
            <span className="text-sm text-[#64748B] whitespace-nowrap">
              {field.unit}
            </span>
          )}
        </div>
      );

    case "select_single":
      return (
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1"
        >
          <option value="">
            {field.placeholder ?? "選択してください"}
          </option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
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
          className="border-slate-200"
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
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 p-4">
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
          className="border-slate-200"
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
    return <p className="text-sm text-[#64748B]">--</p>;
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
                  ? "fill-[#D97706] text-[#D97706]"
                  : "text-slate-200"
              }`}
            />
          ))}
          <span className="ml-2 text-sm font-mono text-[#1E293B]">
            {rating}/{field.max ?? 5}
          </span>
        </div>
      );
    }

    case "select_multi": {
      const items = value as string[];
      return (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item}
              className="inline-flex items-center rounded-md border border-slate-200 bg-[#F0F4FF] px-2 py-0.5 text-xs text-[#0C025F]"
            >
              {item}
            </span>
          ))}
        </div>
      );
    }

    case "textarea":
      return (
        <p className="text-sm text-[#1E293B] whitespace-pre-wrap">
          {value as string}
        </p>
      );

    case "number":
      return (
        <p className="text-sm font-mono text-[#1E293B]">
          {value as number}
          {field.unit && (
            <span className="ml-1 text-[#64748B]">{field.unit}</span>
          )}
        </p>
      );

    case "link":
      return (
        <a
          href={value as string}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[#2563EB] underline break-all"
        >
          {value as string}
        </a>
      );

    case "repeater": {
      const rows = value as Record<string, unknown>[];
      if (!rows || rows.length === 0) {
        return <p className="text-sm text-[#64748B]">--</p>;
      }
      return (
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-200 p-3 space-y-1"
            >
              {field.fields?.map((childField) => (
                <div key={childField.key} className="flex items-baseline gap-2">
                  <span className="text-xs text-[#64748B]">
                    {childField.label}:
                  </span>
                  <span className="text-sm text-[#1E293B]">
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
      return <p className="text-sm text-[#1E293B]">{String(value)}</p>;
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
    <div className="flex flex-wrap gap-3">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value.includes(opt)}
            onChange={() => toggle(opt)}
            className="h-4 w-4 rounded border-slate-200 text-[#2563EB] focus:ring-[#2563EB]"
          />
          <span className="text-sm text-[#1E293B]">{opt}</span>
        </label>
      ))}
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
            className="rounded p-0.5 transition-colors hover:bg-[#F0F4FF]"
          >
            <Star
              className={`h-6 w-6 ${
                i < value
                  ? "fill-[#D97706] text-[#D97706]"
                  : "text-slate-200 hover:text-[#D97706]"
              }`}
            />
          </button>
        );
      })}
      <span className="ml-2 text-sm font-mono text-[#64748B]">
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
          className="rounded-lg border border-slate-200 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">
              #{index + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeRow(index)}
              className="h-7 w-7 p-0 text-[#DC2626] hover:text-[#DC2626] hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {childFields.map((childField) => (
            <div key={childField.key} className="space-y-1.5">
              <Label className="text-sm text-[#1E293B]">
                {childField.label}
                {childField.required && (
                  <span className="ml-1 text-[#DC2626]">*</span>
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
        className="border-slate-200"
      >
        <Plus className="mr-1 h-4 w-4" />
        行を追加
      </Button>
    </div>
  );
}
