"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Search,
  Plus,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from "lucide-react";
import {
  createKnowledgePost,
  searchKnowledge,
  deleteKnowledgePost,
} from "./actions";
import { useServerAction } from "@/hooks/useServerAction";

interface KnowledgePostWithUser {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  user_name: string;
  user_avatar_url: string | null;
}

interface KnowledgePageClientProps {
  initialPosts: KnowledgePostWithUser[];
  allTags: string[];
  currentUserId: string;
  isAdmin: boolean;
}

function formatDateJP(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export function KnowledgePageClient({
  initialPosts,
  allTags,
  currentUserId,
  isAdmin,
}: KnowledgePageClientProps) {
  const [posts, setPosts] = useState<KnowledgePostWithUser[]>(initialPosts);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [showNewPostDialog, setShowNewPostDialog] = useState(false);
  const [searching, setSearching] = useState(false);

  // New post form state
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newTags, setNewTags] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  // Filter posts by selected tag (client-side)
  const filteredPosts = useMemo(() => {
    if (!selectedTag) return posts;
    return posts.filter((p) => p.tags.includes(selectedTag));
  }, [posts, selectedTag]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      // Reset to initial
      setPosts(initialPosts);
      return;
    }

    setSearching(true);
    const result = await searchKnowledge(searchQuery);
    setSearching(false);

    if (result.success && result.data) {
      const searchResults = (
        result.data as Record<string, unknown>[]
      ).map((p: Record<string, unknown>) => {
        const user = p.users as Record<string, unknown> | null;
        return {
          id: p.id as string,
          tenant_id: p.tenant_id as string,
          user_id: p.user_id as string,
          title: p.title as string,
          body: p.body as string,
          tags: (p.tags as string[]) ?? [],
          created_at: p.created_at as string,
          updated_at: p.updated_at as string,
          user_name: (user?.name as string) ?? "",
          user_avatar_url: (user?.avatar_url as string) ?? null,
        };
      });
      setPosts(searchResults);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const {
    execute: execCreate,
    isPending: isCreating,
    error: createError,
  } = useServerAction(createKnowledgePost, {
    onSuccess: () => {
      setNewTitle("");
      setNewBody("");
      setNewTags("");
      setShowNewPostDialog(false);
      window.location.reload();
    },
  });

  const {
    execute: execDelete,
  } = useServerAction(deleteKnowledgePost, {
    onSuccess: () => {
      // revalidatePath runs server-side; also remove locally for instant feedback
    },
  });

  const handleCreatePost = () => {
    setClientError(null);

    if (!newTitle.trim()) {
      setClientError("タイトルは必須です");
      return;
    }
    if (!newBody.trim()) {
      setClientError("本文は必須です");
      return;
    }

    const tags = newTags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    execCreate({ title: newTitle.trim(), body: newBody.trim(), tags });
  };

  const handleDelete = useCallback(
    (id: string) => {
      if (!confirm("この投稿を削除しますか？")) return;
      execDelete(id);
      // Optimistic removal
      setPosts((prev) => prev.filter((p) => p.id !== id));
    },
    [execDelete]
  );

  return (
    <div className="space-y-6">
      {/* Search bar & new post button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="ナレッジを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-10 border-border"
          />
        </div>
        <div className="flex items-center gap-2">
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setPosts(initialPosts);
              }}
              className="border-border"
            >
              クリア
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSearch}
            disabled={searching}
            className="border-border"
          >
            {searching ? "検索中..." : "検索"}
          </Button>
          <Button
            onClick={() => setShowNewPostDialog(true)}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <Plus className="mr-1 h-4 w-4" />
            新規投稿
          </Button>
        </div>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag(null)}
            className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              selectedTag === null
                ? "border-accent-color bg-accent-color text-white"
                : "border-border bg-white text-muted-foreground hover:bg-muted"
            }`}
          >
            すべて
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() =>
                setSelectedTag(selectedTag === tag ? null : tag)
              }
              className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedTag === tag
                  ? "border-accent-color bg-accent-color text-white"
                  : "border-border bg-white text-muted-foreground hover:bg-muted"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Post list */}
      {filteredPosts.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery
              ? "検索結果が見つかりませんでした"
              : "ナレッジ投稿はまだありません"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post) => {
            const isExpanded = expandedPostId === post.id;
            const canDelete =
              post.user_id === currentUserId || isAdmin;

            return (
              <div
                key={post.id}
                className="rounded-lg border border-border bg-white"
              >
                <button
                  onClick={() =>
                    setExpandedPostId(isExpanded ? null : post.id)
                  }
                  className="flex w-full items-start justify-between px-5 py-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-primary truncate">
                      {post.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{post.user_name}</span>
                      <span>|</span>
                      <span>{formatDateJP(post.created_at)}</span>
                    </div>
                    {/* Tags */}
                    {post.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {post.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-primary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Body preview when collapsed */}
                    {!isExpanded && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {post.body}
                      </p>
                    )}
                  </div>
                  <div className="ml-3 flex-shrink-0 pt-1">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="border-t border-border px-5 py-4">
                    <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                      {post.body}
                    </div>
                    {canDelete && (
                      <div className="mt-4 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(post.id);
                          }}
                          className="border-danger text-danger hover:bg-red-50"
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          削除
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New post dialog */}
      {showNewPostDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative mx-4 w-full max-w-xl rounded-lg border border-border bg-white">
            {/* Dialog header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-primary">
                新規ナレッジ投稿
              </h2>
              <button
                onClick={() => {
                  setShowNewPostDialog(false);
                  setClientError(null);
                }}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dialog body */}
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">
                  タイトル <span className="text-danger">*</span>
                </Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="ナレッジのタイトル"
                  className="border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">
                  本文 <span className="text-danger">*</span>
                </Label>
                <Textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="ナレッジの内容を記述してください"
                  rows={8}
                  className="border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">
                  タグ
                </Label>
                <Input
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="カンマ区切りでタグを入力（例: 営業,テクニック,新人向け）"
                  className="border-border"
                />
                <p className="text-xs text-muted-foreground">
                  カンマ（,）で区切って複数のタグを追加できます
                </p>
              </div>

              {(clientError || createError) && (
                <p className="text-sm text-danger">{clientError || createError}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewPostDialog(false);
                    setClientError(null);
                  }}
                  disabled={isCreating}
                  className="border-border"
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleCreatePost}
                  disabled={isCreating}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  {isCreating ? "投稿中..." : "投稿する"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
