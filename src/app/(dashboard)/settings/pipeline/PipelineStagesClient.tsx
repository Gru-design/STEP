"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addPipelineStage,
  updatePipelineStage,
  deletePipelineStage,
  reorderPipelineStages,
  initializePresetStages,
} from "./actions";
import type { PipelineStage } from "@/types/database";
import { ArrowUp, ArrowDown, Pencil, Trash2, Plus, Zap, Check, X } from "lucide-react";

interface PipelineStagesClientProps {
  initialStages: PipelineStage[];
}

export function PipelineStagesClient({ initialStages }: PipelineStagesClientProps) {
  const [stages, setStages] = useState<PipelineStage[]>(initialStages);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      const result = await addPipelineStage(newName.trim());
      if (result.success) {
        // Re-fetch by reloading — server action already revalidated
        window.location.reload();
      } else {
        showMessage("error", result.error ?? "エラーが発生しました");
      }
    });
  };

  const handleUpdate = (id: string) => {
    if (!editingName.trim()) return;
    startTransition(async () => {
      const result = await updatePipelineStage(id, editingName.trim());
      if (result.success) {
        setStages((prev: PipelineStage[]) =>
          prev.map((s: PipelineStage) => (s.id === id ? { ...s, name: editingName.trim() } : s))
        );
        setEditingId(null);
        showMessage("success", "ステージ名を更新しました");
      } else {
        showMessage("error", result.error ?? "エラーが発生しました");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deletePipelineStage(id);
      if (result.success) {
        setStages((prev: PipelineStage[]) => prev.filter((s: PipelineStage) => s.id !== id));
        showMessage("success", "ステージを削除しました");
      } else {
        showMessage("error", result.error ?? "エラーが発生しました");
      }
    });
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const newStages = [...stages];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newStages.length) return;

    [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
    setStages(newStages);

    const orderedIds = newStages.map((s) => s.id);
    startTransition(async () => {
      const result = await reorderPipelineStages(orderedIds);
      if (!result.success) {
        setStages(stages); // revert
        showMessage("error", result.error ?? "並び替えに失敗しました");
      }
    });
  };

  const handleInitPreset = () => {
    startTransition(async () => {
      const result = await initializePresetStages();
      if (result.success) {
        window.location.reload();
      } else {
        showMessage("error", result.error ?? "エラーが発生しました");
      }
    });
  };

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            message.type === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          {message.text}
        </div>
      )}

      {stages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <p className="text-sm text-muted-foreground">
              パイプラインステージがまだ設定されていません。
            </p>
            <Button onClick={handleInitPreset} disabled={isPending}>
              <Zap className="mr-2 h-4 w-4" />
              {isPending ? "初期化中..." : "人材紹介プリセットで初期化"}
            </Button>
            <p className="text-xs text-muted-foreground">
              アプローチ → ヒアリング → 求人受注 → 推薦 → 書類通過 → 面接 → 内定 → 入社
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ステージ一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {stages.map((stage, index) => (
                <li
                  key={stage.id}
                  className="flex items-center gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <span className="flex w-8 shrink-0 items-center justify-center text-xs font-medium text-muted-foreground">
                    {index + 1}
                  </span>

                  {editingId === stage.id ? (
                    <>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-9 flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdate(stage.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUpdate(stage.id)}
                        disabled={isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium">
                        {stage.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMove(index, "up")}
                          disabled={index === 0 || isPending}
                          title="上に移動"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMove(index, "down")}
                          disabled={index === stages.length - 1 || isPending}
                          title="下に移動"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(stage.id);
                            setEditingName(stage.name);
                          }}
                          disabled={isPending}
                          title="編集"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(stage.id)}
                          disabled={isPending}
                          className="text-danger hover:text-danger"
                          title="削除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ステージを追加</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="新しいステージ名"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
            />
            <Button onClick={handleAdd} disabled={isPending || !newName.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              {isPending ? "追加中..." : "追加"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
