"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { TemplateBuilder } from "@/components/template-builder/TemplateBuilder";
import { createTemplate } from "../actions";
import type {
  TemplateType,
  TemplateSchema,
  ReportVisibility,
} from "@/types/database";

const typeOptions: { value: TemplateType; label: string }[] = [
  { value: "daily", label: "日報" },
  { value: "weekly", label: "週報" },
  { value: "plan", label: "週次計画" },
  { value: "checkin", label: "チェックイン" },
];

const roleOptions = [
  { value: "admin", label: "管理者" },
  { value: "manager", label: "マネージャー" },
  { value: "member", label: "メンバー" },
];

const visibilityOptions: { value: string; label: string }[] = [
  { value: "inherit", label: "テナント設定に従う" },
  { value: "manager_only", label: "マネージャー以上のみ" },
  { value: "team", label: "チーム全員" },
  { value: "tenant_all", label: "テナント全員" },
];

const emptySchema: TemplateSchema = { sections: [] };

export function NewTemplateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<TemplateType>("daily");
  const [targetRoles, setTargetRoles] = useState<string[]>(["member"]);
  const [visibilityOverride, setVisibilityOverride] = useState("inherit");
  const [schema, setSchema] = useState<TemplateSchema>(emptySchema);

  const toggleRole = (role: string) => {
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = (publish: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await createTemplate({
        name,
        type,
        targetRoles,
        schema,
        visibilityOverride:
          visibilityOverride === "inherit"
            ? null
            : (visibilityOverride as ReportVisibility),
        isPublished: publish,
      });

      if (result.success) {
        router.push("/settings/templates");
      } else {
        setError(result.error ?? "エラーが発生しました");
      }
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-danger bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Template name */}
          <div className="space-y-2">
            <Label htmlFor="name">テンプレート名</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 営業日報テンプレート"
            />
          </div>

          {/* Template type */}
          <div className="space-y-2">
            <Label>テンプレート種別</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as TemplateType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target roles */}
          <div className="space-y-2">
            <Label>対象ロール</Label>
            <div className="flex gap-3">
              {roleOptions.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  <input
                    type="checkbox"
                    checked={targetRoles.includes(opt.value)}
                    onChange={() => toggleRole(opt.value)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Visibility override */}
          <div className="space-y-2">
            <Label>閲覧範囲</Label>
            <Select
              value={visibilityOverride}
              onValueChange={setVisibilityOverride}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visibilityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Template builder */}
      <Card>
        <CardContent className="pt-6">
          <Label className="mb-4 block text-base font-semibold">
            テンプレート構成
          </Label>
          <TemplateBuilder
                initialSchema={schema}
                templateName={name || "新規テンプレート"}
                templateType={type}
                onSave={setSchema}
              />
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => router.push("/settings/templates")}
          disabled={isPending}
        >
          キャンセル
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSubmit(false)}
          disabled={isPending}
        >
          下書き保存
        </Button>
        <Button
          className="bg-primary text-white hover:bg-primary/90"
          onClick={() => handleSubmit(true)}
          disabled={isPending}
        >
          公開
        </Button>
      </div>
    </div>
  );
}
