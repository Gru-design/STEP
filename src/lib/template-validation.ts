import { z } from "zod";

// Zod schemas for validating template JSONB structures

const fieldTypeEnum = z.enum([
  "text", "textarea", "number", "select_single", "select_multi",
  "date", "rating", "file", "link", "section", "repeater"
]);

const baseFieldSchema = z.object({
  key: z.string().min(1, "フィールドキーは必須です"),
  type: fieldTypeEnum,
  label: z.string().min(1, "ラベルは必須です"),
  required: z.boolean(),
  placeholder: z.string().optional(),
  unit: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  options: z.array(z.string()).optional(),
});

// Recursive type for repeater fields
type FieldSchemaType = z.infer<typeof baseFieldSchema> & {
  fields?: FieldSchemaType[];
};

const fieldSchema: z.ZodType<FieldSchemaType> = baseFieldSchema.extend({
  fields: z.lazy(() => z.array(fieldSchema)).optional(),
});

const sectionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1, "セクション名は必須です"),
  fields: z.array(fieldSchema),
});

export const templateSchemaValidator = z.object({
  sections: z.array(sectionSchema),
});

// Validate template schema
export function validateTemplateSchema(schema: unknown): { valid: boolean; errors: string[] } {
  const result = templateSchemaValidator.safeParse(schema);
  if (result.success) {
    // Check for duplicate field keys across all sections
    const allKeys: string[] = [];
    const duplicates: string[] = [];

    for (const section of result.data.sections) {
      for (const field of section.fields) {
        if (allKeys.includes(field.key)) {
          duplicates.push(field.key);
        }
        allKeys.push(field.key);
        // Check repeater child fields too
        if (field.fields) {
          for (const child of field.fields) {
            const compositeKey = `${field.key}.${child.key}`;
            if (allKeys.includes(compositeKey)) {
              duplicates.push(compositeKey);
            }
            allKeys.push(compositeKey);
          }
        }
      }
    }

    if (duplicates.length > 0) {
      return { valid: false, errors: [`フィールドキーが重複しています: ${duplicates.join(", ")}`] };
    }

    // Validate field-type-specific requirements
    const fieldErrors: string[] = [];
    for (const section of result.data.sections) {
      for (const field of section.fields) {
        if ((field.type === "select_single" || field.type === "select_multi") && (!field.options || field.options.length === 0)) {
          fieldErrors.push(`${field.label}: 選択フィールドには選択肢が必要です`);
        }
        if (field.type === "repeater" && (!field.fields || field.fields.length === 0)) {
          fieldErrors.push(`${field.label}: リピーターフィールドには子フィールドが必要です`);
        }
        if (field.type === "number" || field.type === "rating") {
          if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
            fieldErrors.push(`${field.label}: 最小値が最大値を超えています`);
          }
        }
      }
    }

    if (fieldErrors.length > 0) {
      return { valid: false, errors: fieldErrors };
    }

    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: result.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`),
  };
}

// Template metadata validation
export const templateMetaSchema = z.object({
  name: z.string().min(1, "テンプレート名は必須です").max(100, "テンプレート名は100文字以内です"),
  type: z.enum(["daily", "weekly", "plan", "checkin"], {
    error: "テンプレートタイプを選択してください"
  }),
  targetRoles: z.array(z.string()).min(1, "対象ロールを1つ以上選択してください"),
  visibilityOverride: z.enum(["manager_only", "team", "tenant_all"]).nullable().optional(),
});
