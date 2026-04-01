"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Send, Globe, ArrowUpFromLine, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  syncGlobalTemplateToTenants,
  promoteToGlobalTemplate,
  listAllTenantTemplates,
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

interface TenantTemplate {
  id: string;
  name: string;
  type: TemplateType;
  tenant_id: string;
  tenants: { name: string };
  version: number;
  updated_at: string;
}

export function GlobalTemplatesClient({ templates }: GlobalTemplatesClientProps) {
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<ReportTemplate | null>(null);
  const [applyResult, setApplyResult] = useState<{
    distributed: number;
    skipped: number;
  } | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  // Promote dialog state
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [tenantTemplates, setTenantTemplates] = useState<TenantTemplate[]>([]);
  const [promoteSearch, setPromoteSearch] = useState("");
  const [loadingTenantTemplates, setLoadingTenantTemplates] = useState(false);

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

  const handleSync = (templateId: string, templateName: string) => {
    startTransition(async () => {
      const result = await syncGlobalTemplateToTenants(templateId);
      if (result.success && result.data) {
        const { updated, created } = result.data;
        const parts: string[] = [];
        if (updated > 0) parts.push(`${updated}件更新`);
        if (created > 0) parts.push(`${created}件新規配布`);
        setNotification(
          `「${templateName}」を全テナントに反映しました（${parts.length > 0 ? parts.join("、") : "変更なし"}）`
        );
      }
    });
  };

  const handleOpenPromoteDialog = () => {
    setShowPromoteDialog(true);
    setLoadingTenantTemplates(true);
    startTransition(async () => {
      const result = await listAllTenantTemplates();
      if (result.success && result.data) {
        setTenantTemplates(result.data as TenantTemplate[]);
      }
      setLoadingTenantTemplates(false);
    });
  };

  const handleSearchTenantTemplates = () => {
    setLoadingTenantTemplates(true);
    startTransition(async () => {
      const result = await listAllTenantTemplates({
        search: promoteSearch || undefined,
      });
      if (result.success && result.data) {
        setTenantTemplates(result.data as TenantTemplate[]);
      }
      setLoadingTenantTemplates(false);
    });
  };

  const handlePromote = (templateId: string) => {
    startTransition(async () => {
      const result = await promoteToGlobalTemplate(templateId);
      if (result.success && result.data) {
        setShowPromoteDialog(false);
        setNotification(
          `「${result.data.sourceTenantName}」のテンプレートをグローバルに昇格しました`
        );
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary flex items-center gap-2">
            <Globe className="h-5 w-5 sm:h-6 sm:w-6" />
            グローバルテンプレート
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            全テナントに自動配布されるテンプレートを管理します
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenPromoteDialog}
            disabled={isPending}
            className="sm:size-default"
          >
            <ArrowUpFromLine className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">テナントから</span>取り込み
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleApplyAll}
            disabled={isPending || templates.length === 0}
            className="sm:size-default"
          >
            <Send className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">全テナントに</span>配布
          </Button>
          <Button asChild size="sm" className="bg-primary text-white hover:bg-primary/90 sm:size-default">
            <Link href="/admin/global-templates/new">
              <Plus className="mr-1 sm:mr-2 h-4 w-4" />
              新規作成
            </Link>
          </Button>
        </div>
      </div>

      {/* Notifications */}
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
      {notification && (
        <div className="mb-4 p-3 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm flex items-center justify-between">
          <span>{notification}</span>
          <button
            onClick={() => setNotification(null)}
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
                <div className="mt-4 flex flex-wrap items-center gap-2">
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
                    className="h-8 text-xs"
                    disabled={isPending}
                    onClick={() => handleSync(template.id, template.name)}
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    全テナントに反映
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

      {/* Promote from tenant dialog */}
      <Dialog
        open={showPromoteDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowPromoteDialog(false);
            setPromoteSearch("");
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpFromLine className="h-5 w-5" />
              テナントのテンプレートをグローバルに取り込み
            </DialogTitle>
            <DialogDescription>
              テナントで作成されたテンプレートを選択してグローバルテンプレートに昇格します。
              既にグローバルから配布されたテンプレートは表示されません。
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 mt-2">
            <Input
              placeholder="テンプレート名で検索..."
              value={promoteSearch}
              onChange={(e) => setPromoteSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchTenantTemplates()}
            />
            <Button
              variant="outline"
              onClick={handleSearchTenantTemplates}
              disabled={isPending}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <div className="overflow-y-auto flex-1 mt-2 -mx-1 px-1">
            {loadingTenantTemplates ? (
              <p className="text-center text-muted-foreground py-8">読み込み中...</p>
            ) : tenantTemplates.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                該当するテンプレートがありません
              </p>
            ) : (
              <div className="space-y-2">
                {tenantTemplates.map((tt) => (
                  <div
                    key={tt.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-border p-3 hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground truncate">
                          {tt.name}
                        </span>
                        <Badge className={`${typeBadgeColors[tt.type]} text-[10px]`}>
                          {typeLabels[tt.type]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        テナント: {tt.tenants?.name ?? "不明"} / v{tt.version} / 更新: {formatDate(tt.updated_at)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-primary text-white hover:bg-primary/90 shrink-0 w-full sm:w-auto"
                      disabled={isPending}
                      onClick={() => handlePromote(tt.id)}
                    >
                      <ArrowUpFromLine className="mr-1 h-3 w-3" />
                      取り込み
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowPromoteDialog(false)}
            >
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
