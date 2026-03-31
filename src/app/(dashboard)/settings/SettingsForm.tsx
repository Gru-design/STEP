"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTenantSettings } from "./actions";
import type { Tenant, ReportVisibility } from "@/types/database";

const visibilityOptions: {
  value: ReportVisibility;
  label: string;
  description: string;
}[] = [
  {
    value: "manager_only",
    label: "マネージャーのみ",
    description: "マネージャー以上のみが日報を閲覧できます。機密性の高い情報を含む場合に適しています。",
  },
  {
    value: "team",
    label: "チーム内共有",
    description: "同じチームのメンバー全員が日報を閲覧できます。ピアラーニング・情報共有に適しています。",
  },
  {
    value: "tenant_all",
    label: "テナント全体",
    description: "テナント内の全ユーザーが日報を閲覧できます。全社的な透明性を重視する場合に適しています。",
  },
];

interface SettingsFormProps {
  tenant: Tenant;
}

export function SettingsForm({ tenant }: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [visibility, setVisibility] = useState<ReportVisibility>(
    tenant.report_visibility
  );
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = (formData: FormData) => {
    formData.set("report_visibility", visibility);
    setMessage(null);
    startTransition(async () => {
      const result = await updateTenantSettings(formData);
      if (result.success) {
        setMessage({ type: "success", text: "設定を更新しました" });
      } else {
        setMessage({
          type: "error",
          text: result.error ?? "エラーが発生しました",
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">基本設定</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="tenant-name">テナント名</Label>
            <Input
              id="tenant-name"
              name="name"
              defaultValue={tenant.name}
              required
            />
          </div>

          <div className="space-y-3">
            <Label>日報閲覧ポリシー</Label>
            <Select
              value={visibility}
              onValueChange={(v) => setVisibility(v as ReportVisibility)}
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
            <div className="rounded-lg border border-border bg-muted p-3">
              <p className="text-sm text-foreground">
                {visibilityOptions.find((o) => o.value === visibility)
                  ?.description ?? ""}
              </p>
            </div>
          </div>

          {message && (
            <p
              className={`text-sm ${
                message.type === "success"
                  ? "text-success"
                  : "text-danger"
              }`}
            >
              {message.text}
            </p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "保存中..." : "保存"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
