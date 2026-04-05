"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Pencil, Copy, Trash2, Eye, EyeOff, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { publishTemplate, deleteTemplate, duplicateTemplate } from "./actions";
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
  const date = new Date(dateStr);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

interface TemplateListClientProps {
  templates: ReportTemplate[];
}

export function TemplateListClient({ templates }: TemplateListClientProps) {
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<ReportTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const filteredTemplates =
    activeTab === "all"
      ? templates
      : templates.filter((t) => t.type === activeTab);

  const handlePublishToggle = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      await publishTemplate(id, !currentStatus);
    });
  };

  const handleDuplicate = (id: string) => {
    startTransition(async () => {
      await duplicateTemplate(id);
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      await deleteTemplate(deleteTarget.id);
      setDeleteTarget(null);
    });
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">テンプレート管理</h1>
        <Button asChild className="bg-primary text-white hover:bg-primary/90">
          <Link href="/settings/templates/new">
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="all">全て</TabsTrigger>
          <TabsTrigger value="daily">日報</TabsTrigger>
          <TabsTrigger value="weekly">週報</TabsTrigger>
          <TabsTrigger value="plan">計画</TabsTrigger>
          <TabsTrigger value="checkin">チェックイン</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted py-12">
              <p className="text-muted-foreground">テンプレートがありません</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/settings/templates/new">
                  <Plus className="mr-2 h-4 w-4" />
                  新規作成
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <Card key={template.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold text-foreground line-clamp-1">
                        {template.name}
                      </CardTitle>
                      <div className="flex shrink-0 gap-1.5">
                        {template.source_template_id && (
                          <Badge
                            variant="outline"
                            className="border-primary text-primary text-[10px] gap-0.5"
                          >
                            <Globe className="h-3 w-3" />
                            共通
                          </Badge>
                        )}
                        <Badge
                          className={typeBadgeColors[template.type]}
                        >
                          {typeLabels[template.type]}
                        </Badge>
                        <Badge
                          variant={template.is_published ? "default" : "outline"}
                          className={
                            template.is_published
                              ? "bg-success text-white border-transparent"
                              : ""
                          }
                        >
                          {template.is_published ? "公開" : "非公開"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>v{template.version}</span>
                      <span>作成: {formatDate(template.created_at)}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-1.5">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                      >
                        <Link href={`/settings/templates/${template.id}`}>
                          <Pencil className="mr-1 h-3 w-3" />
                          編集
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        disabled={isPending}
                        onClick={() =>
                          handlePublishToggle(template.id, template.is_published)
                        }
                      >
                        {template.is_published ? (
                          <>
                            <EyeOff className="mr-1 h-3 w-3" />
                            非公開
                          </>
                        ) : (
                          <>
                            <Eye className="mr-1 h-3 w-3" />
                            公開
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        disabled={isPending}
                        onClick={() => handleDuplicate(template.id)}
                      >
                        <Copy className="mr-1 h-3 w-3" />
                        複製
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
        </TabsContent>
      </Tabs>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>テンプレートの削除</DialogTitle>
            <DialogDescription>
              「{deleteTarget?.name}」を削除しますか？この操作は取り消せません。
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
