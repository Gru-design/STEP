"use client";

import { useState, useTransition, useCallback } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TemplateBuilder } from "@/components/template-builder/TemplateBuilder";
import { createTemplate } from "../actions";
import {
  FileText,
  Settings2,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import type {
  TemplateType,
  TemplateSchema,
  ReportVisibility,
} from "@/types/database";

const typeOptions: { value: TemplateType; label: string; description: string }[] = [
  { value: "daily", label: "日報", description: "毎日の業務報告" },
  { value: "weekly", label: "週報", description: "週次の振り返り" },
  { value: "plan", label: "週次計画", description: "週のアクション計画" },
  { value: "checkin", label: "チェックイン", description: "週初めの確認" },
];

const roleOptions = [
  { value: "admin", label: "管理者" },
  { value: "manager", label: "マネージャー" },
  { value: "member", label: "メンバー" },
];

const visibilityOptions: { value: string; label: string; description: string }[] = [
  { value: "inherit", label: "テナント設定に従う", description: "テナントのデフォルト設定を使用" },
  { value: "manager_only", label: "マネージャー以上のみ", description: "管理者とマネージャーだけが閲覧可能" },
  { value: "team", label: "チーム全員", description: "同じチームのメンバーが閲覧可能" },
  { value: "tenant_all", label: "テナント全員", description: "テナント内の全員が閲覧可能" },
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

  const handleSchemaSave = useCallback((s: TemplateSchema) => {
    setSchema(s);
  }, []);

  const handleSubmit = (publish: boolean) => {
    if (!name.trim()) {
      setError("テンプレート名を入力してください");
      return;
    }
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

  const fieldCount = schema.sections.reduce((acc, s) => acc + s.fields.length, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/settings/templates")}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-foreground">新規テンプレート作成</h1>
          <p className="text-xs text-muted-foreground">
            日報や週報のフォーマットを定義します
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Step 1: Basic settings */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Settings2 className="h-4 w-4 text-primary" />
            基本設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Template name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">
                テンプレート名
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 営業日報テンプレート"
                className="h-9"
              />
            </div>

            {/* Template type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                テンプレート種別
              </Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as TemplateType)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <span>{opt.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {opt.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Target roles */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                対象ロール
              </Label>
              <div className="flex gap-2">
                {roleOptions.map((opt) => {
                  const isChecked = targetRoles.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleRole(opt.value)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium motion-safe:transition-all ${
                        isChecked
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-white text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visibility override */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                閲覧範囲
              </Label>
              <Select
                value={visibilityOverride}
                onValueChange={setVisibilityOverride}
              >
                <SelectTrigger className="h-9">
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
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Template builder */}
      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-bold">
              <FileText className="h-4 w-4 text-primary" />
              テンプレート構成
            </span>
            {fieldCount > 0 && (
              <Badge variant="secondary" className="text-xs font-normal">
                {schema.sections.length}セクション / {fieldCount}フィールド
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <TemplateBuilder
            initialSchema={schema}
            templateName={name || "新規テンプレート"}
            templateType={type}
            onSave={handleSchemaSave}
          />
        </CardContent>
      </Card>

      {/* Action buttons - sticky bottom on mobile */}
      <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-end gap-3 border-t border-border bg-white/95 px-4 py-3 backdrop-blur-sm sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Button
          variant="outline"
          onClick={() => router.push("/settings/templates")}
          disabled={isPending}
          className="h-10"
        >
          キャンセル
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSubmit(false)}
          disabled={isPending}
          className="h-10"
        >
          {isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : null}
          下書き保存
        </Button>
        <Button
          onClick={() => handleSubmit(true)}
          disabled={isPending}
          className="h-10 bg-primary text-white hover:bg-primary-hover"
        >
          {isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : null}
          公開
        </Button>
      </div>
    </div>
  );
}
