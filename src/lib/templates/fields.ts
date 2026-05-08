import type {
  FieldType,
  TemplateField,
  TemplateSchema,
} from "@/types/database";

export interface KpiCandidateField {
  key: string;
  label: string;
  type: FieldType;
  unit?: string;
  sectionLabel: string;
}

const KPI_ELIGIBLE_TYPES: ReadonlySet<FieldType> = new Set<FieldType>([
  "number",
  "rating",
]);

export function isKpiEligible(type: FieldType): boolean {
  return KPI_ELIGIBLE_TYPES.has(type);
}

export function getKpiCandidateFields(
  schema: TemplateSchema | null | undefined
): KpiCandidateField[] {
  if (!schema?.sections) return [];
  const result: KpiCandidateField[] = [];
  for (const section of schema.sections) {
    for (const field of section.fields ?? []) {
      if (isKpiEligible(field.type)) {
        result.push({
          key: field.key,
          label: field.label,
          type: field.type,
          unit: field.unit,
          sectionLabel: section.label,
        });
      }
    }
  }
  return result;
}

export function getAllTopLevelFields(
  schema: TemplateSchema | null | undefined
): TemplateField[] {
  if (!schema?.sections) return [];
  const result: TemplateField[] = [];
  for (const section of schema.sections) {
    for (const field of section.fields ?? []) {
      result.push(field);
    }
  }
  return result;
}

const FIELD_KEY_PATTERN = /^[a-z_][a-z0-9_]{0,63}$/;

export function isValidFieldKey(key: string): boolean {
  return FIELD_KEY_PATTERN.test(key);
}

/**
 * Convert a label into a snake_case key suggestion.
 * Returns "" if no usable ASCII characters are present (e.g. pure Japanese label),
 * letting the caller fall back to an auto-generated key.
 */
export function suggestFieldKeyFromLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}
