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
import { updateGlobalTemplate, applyGlobalTemplatesToAllTenants } from "../actions";
import type {
  ReportTemplate,
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

interface EditGlobalTemplateClientProps {
  template: ReportTemplate;
}

export function EditGlobalTemplateClient({ template }: EditGlobalTemplateClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState(template.name);
  const [type, setType] = useState<TemplateType>(template.type);
  const [targetRoles, setTargetRoles] = useState<string[]>(
    template.target_roles ?? []
  );
  const [visibilityOverride, setVisibilityOverride] = useState(
    template.visibility_override ?? "inherit"
  );
  const [schema, setSchema] = useState<TemplateSchema>(
    template.schema ?? { sections: [] }
  );

  const toggleRole = (role: string) => {
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSave = () => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateGlobalTemplate(template.id, {
        name,
        type,
        targetRoles,
        schema,
        visibilityOverride:
          visibilityOverride === "inherit"
            ? null
            : (visibilityOverride as ReportVisibility),
      });

      if (result.success) {
        setSuccess("保存しました。");
      } else {
        setError(result.error ?? "エラーが発生しました");
      }
    });
  };

  const handleSaveAndApply = () => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateGlobalTemplate(template.id, {
        name,
        type,
        targetRoles,
        schema,
        visibilityOverride:
          visibilityOverride === "inherit"
            ? null
            : (visibilityOverride as ReportVisibility),
      });

      if (!result.success) {
        setError(result.error ?? "エラーが発生しました");
        return;
      }

      const applyResult = await applyGlobalTemplatesToAllTenants();
      if (applyResult.success && applyResult.data) {
        setSuccess(
          `保存し、${applyResult.data.distributed}件のテナントに新規配布しました。`
        );
      } else {
        setSuccess("保存しましたが、配布に失敗しました。");
      }
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-danger bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="name">テンプレート名</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: RAコンサルタント日報"
            />
          </div>

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

      <Card>
        <CardContent className="pt-6">
          <Label className="mb-4 block text-base font-semibold">
            テンプレート構成
          </Label>
          <TemplateBuilder
            initialSchema={schema}
            templateName={name || "グローバルテンプレート編集"}
            templateType={type}
            onSave={setSchema}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          バージョン: v{template.version}
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/global-templates")}
            disabled={isPending}
          >
            キャンセル
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isPending}
          >
            保存のみ
          </Button>
          <Button
            className="bg-primary text-white hover:bg-primary/90"
            onClick={handleSaveAndApply}
            disabled={isPending}
          >
            {isPending ? "処理中..." : "保存して全テナントに配布"}
          </Button>
        </div>
      </div>
    </div>
  );
}
