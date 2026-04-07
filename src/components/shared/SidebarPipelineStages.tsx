"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Briefcase,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  addPipelineStage,
  updatePipelineStage,
  deletePipelineStage,
} from "@/app/(dashboard)/settings/pipeline/actions";
import type { PipelineStage } from "@/types/database";
import type { Role } from "@/types/database";

interface SidebarPipelineStagesProps {
  stages: PipelineStage[];
  userRole: Role;
  onLinkClick?: () => void;
}

export function SidebarPipelineStages({
  stages: initialStages,
  userRole,
  onLinkClick,
}: SidebarPipelineStagesProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(pathname.startsWith("/deals"));
  const [stages, setStages] = useState<PipelineStage[]>(initialStages);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = userRole === "admin" || userRole === "super_admin";
  const dealsActive = pathname.startsWith("/deals");

  useEffect(() => {
    if (showAddInput && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [showAddInput]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  useEffect(() => {
    setStages(initialStages);
  }, [initialStages]);

  const clearError = () => {
    setTimeout(() => setError(null), 3000);
  };

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await addPipelineStage(trimmed);
      if (result.success) {
        setNewName("");
        setShowAddInput(false);
        // Reload to get fresh data
        window.location.reload();
      } else {
        setError(result.error ?? "エラーが発生しました");
        clearError();
      }
    });
  };

  const handleUpdate = (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await updatePipelineStage(id, trimmed);
      if (result.success) {
        setStages((prev: PipelineStage[]) =>
          prev.map((s: PipelineStage) => (s.id === id ? { ...s, name: trimmed } : s))
        );
        setEditingId(null);
      } else {
        setError(result.error ?? "エラーが発生しました");
        clearError();
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deletePipelineStage(id);
      if (result.success) {
        setStages((prev: PipelineStage[]) => prev.filter((s: PipelineStage) => s.id !== id));
      } else {
        setError(result.error ?? "エラーが発生しました");
        clearError();
      }
    });
  };

  return (
    <div className="mb-1">
      {/* Main deals nav item with expand toggle */}
      <div className="flex items-center">
        <Link
          href="/deals"
          onClick={onLinkClick}
          className={`flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium motion-safe:transition-colors ${
            dealsActive
              ? "bg-primary/10 text-primary font-semibold"
              : "text-muted-foreground hover:bg-muted hover:text-primary"
          }`}
        >
          <Briefcase className="h-4 w-4" />
          案件
        </Link>
        <button
          onClick={() => setExpanded(!expanded)}
          className="mr-1 rounded p-1 text-muted-foreground hover:bg-muted hover:text-primary motion-safe:transition-colors"
          aria-label={expanded ? "フェーズを閉じる" : "フェーズを開く"}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Expandable stage list */}
      {expanded && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
          {stages.length === 0 && (
            <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
              フェーズ未設定
            </p>
          )}

          {stages.map((stage) => (
            <div key={stage.id} className="group flex items-center gap-0.5">
              {editingId === stage.id ? (
                /* Inline edit */
                <div className="flex flex-1 items-center gap-1 py-0.5">
                  <Input
                    ref={editInputRef}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="h-7 flex-1 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdate(stage.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    disabled={isPending}
                  />
                  <button
                    onClick={() => handleUpdate(stage.id)}
                    disabled={isPending}
                    className="rounded p-0.5 text-success hover:bg-success/10"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                /* Stage label */
                <>
                  <span
                    className="flex-1 truncate rounded px-2 py-1.5 text-xs text-muted-foreground"
                    title={stage.name}
                  >
                    {stage.name}
                  </span>
                  {isAdmin && (
                    <div className="flex items-center opacity-0 group-hover:opacity-100 motion-safe:transition-opacity">
                      <button
                        onClick={() => {
                          setEditingId(stage.id);
                          setEditingName(stage.name);
                        }}
                        className="rounded p-0.5 text-muted-foreground hover:text-primary"
                        title="編集"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(stage.id)}
                        disabled={isPending}
                        className="rounded p-0.5 text-muted-foreground hover:text-danger"
                        title="削除"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {/* Add new stage input */}
          {isAdmin && showAddInput && (
            <div className="flex items-center gap-1 py-0.5">
              <Input
                ref={addInputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="フェーズ名"
                className="h-7 flex-1 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") {
                    setShowAddInput(false);
                    setNewName("");
                  }
                }}
                disabled={isPending}
              />
              <button
                onClick={handleAdd}
                disabled={isPending || !newName.trim()}
                className="rounded p-0.5 text-success hover:bg-success/10 disabled:opacity-40"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  setShowAddInput(false);
                  setNewName("");
                }}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Add button */}
          {isAdmin && !showAddInput && (
            <button
              onClick={() => setShowAddInput(true)}
              className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-primary motion-safe:transition-colors"
            >
              <Plus className="h-3 w-3" />
              フェーズ追加
            </button>
          )}

          {/* Error message */}
          {error && (
            <p className="px-2 py-1 text-[11px] text-danger">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
