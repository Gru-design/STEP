"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Send, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteGlobalTemplate,
  applyGlobalTemplatesToAllTenants,
} from "./actions";
import type { ReportTemplate, TemplateType } from "@/types/database";

const typeLabels: Record<TemplateType, string> = {
  daily: "日報",
  weekly: "週報",
  plan: "計画",
  checkin: "チェックイン",
};

const typeBadgeColors: Record<TemplateType, string> = {
  daily: "bg-accent-color text-white border-transparent",
  weekly: "bg-success text-white border-transparent",
  plan: "bg-warning text-white border-transparent",
  checkin: "bg-primary text-white border-transparent",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

interface GlobalTemplatesClientProps {
  templates: ReportTemplate[];
}

export function GlobalTemplatesClient({ templates }: GlobalTemplatesClientProps) {
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<ReportTemplate | null>(null);
  const [applyResult, setApplyResult] = useState<{
    distributed: number;
    skipped: number;
  } | null>(null);

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      await deleteGlobalTemplate(deleteTarget.id);
      setDeleteTarget(null);
    });
  };

  const handleApplyAll = () => {
    startTransition(async () => {
      const result = await applyGlobalTemplatesToAllTenants();
      if (result.success && result.data) {
        setApplyResult(result.data);
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin">
            <ArrowLeft className="mr-1 h-4 w-4" />
            管理画面
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Globe className="h-6 w-6" />
            グローバルテンプレート
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            全テナントに自動配布されるテンプレートを管理します
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleApplyAll}
            disabled={isPending || templates.length === 0}
          >
            <Send className="mr-2 h-4 w-4" />
            全テナントに配布
          </Button>
          <Button asChild className="bg-primary text-white hover:bg-primary/90">
            <Link href="/admin/global-templates/new">
              <Plus className="mr-2 h-4 w-4" />
              新規作成
            </Link>
          </Button>
        </div>
      </div>

      {/* Apply result notification */}
      {applyResult && (
        <div className="mb-4 p-3 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm flex items-center justify-between">
          <span>
            配布完了: {applyResult.distributed}件を新規配布、{applyResult.skipped}件は既に配布済み
          </span>
          <button
            onClick={() => setApplyResult(null)}
            className="text-xs underline ml-2"
          >
            閉じる
          </button>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-muted py-12">
          <Globe className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            グローバルテンプレートがありません
          </p>
          <Button asChild className="bg-primary text-white hover:bg-primary/90">
            <Link href="/admin/global-templates/new">
              <Plus className="mr-2 h-4 w-4" />
              最初のテンプレートを作成
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold text-foreground line-clamp-1">
                    {template.name}
                  </CardTitle>
                  <Badge className={typeBadgeColors[template.type]}>
                    {typeLabels[template.type]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>v{template.version}</span>
                  <span>作成: {formatDate(template.created_at)}</span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>対象ロール: {(template.target_roles ?? []).join(", ")}</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                  >
                    <Link href={`/admin/global-templates/${template.id}`}>
                      編集
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-danger hover:text-danger"
                    disabled={isPending}
                    onClick={() => setDeleteTarget(template)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    削除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>グローバルテンプレートの削除</DialogTitle>
            <DialogDescription>
              「{deleteTarget?.name}」を削除しますか？既にテナントにコピー済みのテンプレートには影響しません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button
              className="bg-danger text-white hover:bg-danger/90"
              onClick={handleDelete}
              disabled={isPending}
            >
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
