"use client";

import React, { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DynamicForm } from "@/components/reports/DynamicForm";
import { createReportEntry } from "@/app/(dashboard)/reports/actions";
import { useToast } from "@/components/ui/use-toast";
import { Save, Send, FileText, ChevronLeft, Check } from "lucide-react";
import { XPToast } from "@/components/gamification/XPToast";
import type { ReportTemplate, TemplateSchema } from "@/types/database";

interface NewReportFormProps {
  templates: ReportTemplate[];
}

export function NewReportForm({ templates }: NewReportFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  // Auto-select if only one template
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates.length === 1 ? templates[0].id : ""
  );
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [showXPToast, setShowXPToast] = useState(false);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Calculate form progress
  const { totalFields, filledFields, progressPercent } = useMemo(() => {
    if (!selectedTemplate) return { totalFields: 0, filledFields: 0, progressPercent: 0 };

    const schema = selectedTemplate.schema as TemplateSchema;
    let total = 0;
    let filled = 0;

    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (field.type === "section") continue;
        total++;
        const val = formValues[field.key];
        if (val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0)) {
          filled++;
        }
      }
    }

    return {
      totalFields: total,
      filledFields: filled,
      progressPercent: total > 0 ? Math.round((filled / total) * 100) : 0,
    };
  }, [selectedTemplate, formValues]);

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    setFormValues({});
  };

  const handleSave = (status: "draft" | "submitted") => {
    if (!selectedTemplateId) {
      toast({
        title: "テンプレートを選択してください",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      const result = await createReportEntry({
        templateId: selectedTemplateId,
        reportDate,
        data: formValues,
        status,
      });

      if (result.success) {
        if (status === "submitted") {
          // Show XP animation before redirect
          setShowXPToast(true);
          toast({ title: "日報を提出しました" });
          setTimeout(() => router.push("/reports"), 1800);
        } else {
          toast({ title: "下書きを保存しました" });
          router.push("/reports/my");
        }
      } else {
        toast({
          title: result.error ?? "エラーが発生しました",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* XP Toast animation */}
      {showXPToast && (
        <XPToast xp={10} message="日報提出ボーナス" />
      )}

      {/* Header with date and template info */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            日付
          </Label>
          <Input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="w-auto border-border"
          />
        </div>
        {selectedTemplate && templates.length > 1 && (
          <button
            onClick={() => {
              setSelectedTemplateId("");
              setFormValues({});
            }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary motion-safe:transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            テンプレートを変更
          </button>
        )}
      </div>

      {/* Template selection - only shown when needed */}
      {!selectedTemplate && (
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">
            テンプレートを選択
          </Label>
          {templates.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                利用可能なテンプレートがありません。管理者に連絡してください。
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <Card
                  key={t.id}
                  className="cursor-pointer border-border motion-safe:transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.98]"
                  onClick={() => handleSelectTemplate(t.id)}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/8">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {t.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.type === "daily"
                          ? "日報"
                          : t.type === "weekly"
                          ? "週報"
                          : t.type}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form with progress indicator */}
      {selectedTemplate && (
        <>
          {/* Progress bar */}
          <div className="rounded-xl border border-border bg-white p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                入力進捗
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {filledFields}/{totalFields} 項目
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full motion-safe:transition-all duration-300"
                style={{
                  width: `${progressPercent}%`,
                  background:
                    progressPercent === 100
                      ? "var(--color-success)"
                      : progressPercent >= 50
                      ? "var(--color-primary)"
                      : "var(--color-primary)",
                  opacity: progressPercent === 0 ? 0.3 : 1,
                }}
              />
            </div>
          </div>

          {/* Dynamic form */}
          <Card className="border-border">
            <CardContent className="p-4 sm:p-6">
              <DynamicForm
                schema={selectedTemplate.schema as TemplateSchema}
                values={formValues}
                onChange={setFormValues}
              />
            </CardContent>
          </Card>

          {/* Sticky action buttons for mobile */}
          <div className="sticky bottom-16 z-30 -mx-4 border-t border-border bg-white/95 px-4 py-3 backdrop-blur-sm sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none lg:bottom-0">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => handleSave("draft")}
                className="border-border"
              >
                <Save className="mr-1.5 h-4 w-4" />
                下書き
              </Button>
              <Button
                type="button"
                disabled={isPending}
                onClick={() => handleSave("submitted")}
                className="flex-1 bg-primary hover:bg-primary-hover text-white sm:flex-none"
              >
                {isPending ? (
                  "送信中..."
                ) : (
                  <>
                    <Send className="mr-1.5 h-4 w-4" />
                    提出する
                  </>
                )}
              </Button>
              {progressPercent === 100 && !isPending && (
                <span className="hidden sm:flex items-center gap-1 text-xs text-success">
                  <Check className="h-3.5 w-3.5" />
                  全項目入力済み
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
