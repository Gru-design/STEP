"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DynamicForm } from "@/components/reports/DynamicForm";
import { createReportEntry } from "@/app/(dashboard)/reports/actions";
import { useToast } from "@/components/ui/use-toast";
import { Save, Send, FileText } from "lucide-react";
import type { ReportTemplate, TemplateSchema } from "@/types/database";

interface NewReportFormProps {
  templates: ReportTemplate[];
}

export function NewReportForm({ templates }: NewReportFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates.length === 1 ? templates[0].id : ""
  );
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

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
        toast({
          title:
            status === "submitted"
              ? "日報を提出しました"
              : "下書きを保存しました",
        });
        if (status === "submitted") {
          router.push("/reports");
        } else {
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
    <div className="space-y-6">
      {/* Date picker */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground">日付</Label>
        <Input
          type="date"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
          className="w-auto border-border"
        />
      </div>

      {/* Template selection */}
      {!selectedTemplate && (
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">
            テンプレートを選択
          </Label>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              利用可能なテンプレートがありません。管理者に連絡してください。
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <Card
                  key={t.id}
                  className="cursor-pointer border-border transition-colors hover:bg-muted"
                  onClick={() => handleSelectTemplate(t.id)}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <FileText className="h-5 w-5 text-accent-color shrink-0" />
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

      {/* Template change */}
      {selectedTemplate && templates.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            テンプレート: {selectedTemplate.name}
          </span>
          <button
            onClick={() => {
              setSelectedTemplateId("");
              setFormValues({});
            }}
            className="text-sm text-accent-color hover:underline"
          >
            変更
          </button>
        </div>
      )}

      {/* Dynamic form */}
      {selectedTemplate && (
        <>
          <Card className="border-border">
            <CardContent className="p-4 sm:p-6">
              <DynamicForm
                schema={selectedTemplate.schema as TemplateSchema}
                values={formValues}
                onChange={setFormValues}
              />
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => handleSave("draft")}
              className="border-border"
            >
              <Save className="mr-1 h-4 w-4" />
              下書き保存
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={() => handleSave("submitted")}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Send className="mr-1 h-4 w-4" />
              提出
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
