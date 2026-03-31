"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { DynamicForm } from "@/components/reports/DynamicForm";
import { X, Sparkles } from "lucide-react";
import type { ReportTemplate, TemplateSchema } from "@/types/database";
import { createReportEntry } from "@/app/(dashboard)/reports/actions";

interface CheckinModalProps {
  userId: string;
  tenantId: string;
}

export function CheckinModal({ userId, tenantId }: CheckinModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [template, setTemplate] = useState<ReportTemplate | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const checkAndShow = useCallback(async () => {
    // Check if today is Monday
    const today = new Date();
    if (today.getDay() !== 1) return;

    // Check if dismissed this session
    const dismissKey = `checkin_dismissed_${today.toISOString().split("T")[0]}`;
    if (sessionStorage.getItem(dismissKey)) return;

    try {
      // Fetch checkin template
      const res = await fetch(
        `/api/checkin-check?userId=${userId}&tenantId=${tenantId}`
      );
      if (!res.ok) return;

      const data = await res.json();

      if (data.needsCheckin && data.template) {
        setTemplate(data.template as ReportTemplate);
        setIsOpen(true);
      }
    } catch {
      // Silently fail - don't block the user
    }
  }, [userId, tenantId]);

  useEffect(() => {
    checkAndShow();
  }, [checkAndShow]);

  const handleDismiss = () => {
    const today = new Date().toISOString().split("T")[0];
    sessionStorage.setItem(`checkin_dismissed_${today}`, "true");
    setDismissed(true);
    setIsOpen(false);
  };

  const handleSubmit = async () => {
    if (!template) return;
    setSubmitting(true);
    setError(null);

    const today = new Date().toISOString().split("T")[0];

    const result = await createReportEntry({
      templateId: template.id,
      reportDate: today,
      data: formValues,
      status: "submitted",
    });

    setSubmitting(false);

    if (result.success) {
      setIsOpen(false);
      setDismissed(true);
    } else {
      setError(result.error ?? "チェックインの送信に失敗しました");
    }
  };

  if (!isOpen || dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F0F4FF]">
              <Sparkles className="h-5 w-5 text-[#2563EB]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#0C025F]">
                チェックインを始める
              </h2>
              <p className="text-sm text-[#64748B]">
                今週のコンディションを教えてください
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded-lg p-2 text-[#64748B] hover:bg-[#F0F4FF] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {template && (
            <DynamicForm
              schema={template.schema as TemplateSchema}
              values={formValues}
              onChange={setFormValues}
            />
          )}

          {error && (
            <p className="text-sm text-[#DC2626]">{error}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleDismiss}
              disabled={submitting}
              className="border-slate-200"
            >
              あとで
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#0C025F] hover:bg-[#0C025F]/90 text-white"
            >
              {submitting ? "送信中..." : "チェックイン送信"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
