"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Users, Briefcase, Target } from "lucide-react";
import { exportData } from "./actions";

interface ExportClientProps {
  // tenantId/userId はサーバーアクション内で認証から取得するため不要だが
  // 既存の page.tsx との互換性のためプロパティは残す
  tenantId: string;
  userId: string;
}

const exportTargets = [
  {
    id: "users",
    label: "ユーザー一覧",
    description: "全メンバーの名前・メール・ロール",
    icon: Users,
  },
  {
    id: "reports",
    label: "日報データ",
    description: "全日報エントリー（直近90日）",
    icon: FileText,
  },
  {
    id: "deals",
    label: "案件データ",
    description: "全案件の会社名・金額・ステータス",
    icon: Briefcase,
  },
  {
    id: "goals",
    label: "目標データ",
    description: "全目標と進捗スナップショット",
    icon: Target,
  },
] as const;

type ExportTarget = (typeof exportTargets)[number]["id"];

export function ExportClient({ tenantId: _tenantId, userId: _userId }: ExportClientProps) { // eslint-disable-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(target: ExportTarget) {
    setLoading(target);
    setError(null);

    const result = await exportData(target);
    if (!result.success) {
      setError(result.error ?? "エクスポートに失敗しました");
      setLoading(null);
      return;
    }

    // Trigger download
    const blob = new Blob([result.csv ?? ""], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `step_${target}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setLoading(null);
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {exportTargets.map((target) => {
          const Icon = target.icon;
          return (
            <Card key={target.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-primary" />
                  {target.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-muted-foreground">
                  {target.description}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleExport(target.id)}
                  disabled={loading !== null}
                >
                  <Download className="h-3.5 w-3.5" />
                  {loading === target.id ? "エクスポート中..." : "CSV ダウンロード"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
