"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  addPipelineStage,
  deletePipelineStage,
  initializePresetStages,
} from "@/app/(dashboard)/settings/pipeline/actions";
import type { PipelineStage } from "@/types/database";

interface StageManagerBarProps {
  stages: PipelineStage[];
}

export function StageManagerBar({ stages }: StageManagerBarProps) {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setTimeout(() => setError(null), 4000);

  const handleAddStage = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await addPipelineStage(trimmed);
      if (result.success) {
        setNewName("");
        setError(null);
      } else {
        setError(result.error ?? "エラーが発生しました");
        clearError();
      }
    });
  };

  const handleDeleteStage = (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    startTransition(async () => {
      const result = await deletePipelineStage(id);
      if (!result.success) {
        setError(result.error ?? "エラーが発生しました");
        clearError();
      }
    });
  };

  const handleInitPreset = () => {
    startTransition(async () => {
      const result = await initializePresetStages();
      if (!result.success) {
        setError(result.error ?? "エラーが発生しました");
        clearError();
      }
    });
  };

  // Empty state: show preset initialization
  if (stages.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-xl border border-border bg-muted">
        <p className="text-sm text-muted-foreground">
          パイプラインのフェーズがまだありません
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleInitPreset} disabled={isPending}>
            {isPending ? "作成中..." : "人材紹介プリセットで作成"}
          </Button>
          <span className="text-xs text-muted-foreground">または</span>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-1.5 h-4 w-4" />
                カスタムフェーズを追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>フェーズを追加</DialogTitle>
                <DialogDescription>
                  案件パイプラインの新しいフェーズ名を入力してください
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="フェーズ名（例: アプローチ）"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddStage();
                    }
                  }}
                  disabled={isPending}
                  autoFocus
                />
                {error && <p className="text-sm text-danger">{error}</p>}
                <Button
                  onClick={handleAddStage}
                  disabled={isPending || !newName.trim()}
                  className="w-full"
                >
                  {isPending ? "追加中..." : "追加"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Stage management dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">フェーズ管理</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>フェーズ管理</DialogTitle>
            <DialogDescription>
              フェーズの追加・削除ができます。案件が紐づいているフェーズは削除できません。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Existing stages */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">現在のフェーズ</p>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {stages.map((stage, index) => (
                  <li
                    key={stage.id}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {index + 1}
                      </span>
                      <span className="text-sm">{stage.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteStage(stage.id, stage.name)}
                      disabled={isPending}
                      className="rounded p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger disabled:opacity-40 motion-safe:transition-colors"
                      title="削除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Add new */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">フェーズを追加</p>
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="新しいフェーズ名"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddStage();
                  }}
                  disabled={isPending}
                />
                <Button
                  onClick={handleAddStage}
                  disabled={isPending || !newName.trim()}
                  size="sm"
                  className="shrink-0"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {isPending ? "..." : "追加"}
                </Button>
              </div>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
