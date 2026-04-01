"use client";

import React, { useState, useTransition } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Reply, Trash2, Send } from "lucide-react";
import { addComment, deleteComment } from "@/app/(dashboard)/reports/comment-actions";

interface Comment {
  id: string;
  entry_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  users: { name: string; avatar_url: string | null } | null;
}

interface CommentThreadProps {
  entryId: string;
  comments: Comment[];
  currentUserId: string;
  currentUserRole: string;
}

export function CommentThread({
  entryId,
  comments,
  currentUserId,
  currentUserRole,
}: CommentThreadProps) {
  const [showForm, setShowForm] = useState(false);

  // Build tree: top-level + replies
  const topLevel = comments.filter((c) => !c.parent_id);
  const replies = comments.filter((c) => c.parent_id);
  const replyMap = new Map<string, Comment[]>();
  for (const r of replies) {
    const list = replyMap.get(r.parent_id!) || [];
    list.push(r);
    replyMap.set(r.parent_id!, list);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MessageCircle className="h-4 w-4" />
          コメント
          {comments.length > 0 && (
            <span className="text-muted-foreground">({comments.length})</span>
          )}
        </h3>
        {!showForm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowForm(true)}
            className="text-xs"
          >
            コメントする
          </Button>
        )}
      </div>

      {/* New comment form */}
      {showForm && (
        <CommentForm
          entryId={entryId}
          onCancel={() => setShowForm(false)}
          onSubmitted={() => setShowForm(false)}
        />
      )}

      {/* Comment list */}
      {topLevel.length === 0 && !showForm && (
        <p className="py-4 text-center text-xs text-muted-foreground">
          まだコメントがありません
        </p>
      )}

      {topLevel.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          replies={replyMap.get(comment.id) || []}
          entryId={entryId}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
        />
      ))}
    </div>
  );
}

function CommentItem(props: {
  comment: Comment;
  replies: Comment[];
  entryId: string;
  currentUserId: string;
  currentUserRole: string;
}) {
  const { comment, replies, entryId, currentUserId, currentUserRole } = props;
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canDelete =
    comment.user_id === currentUserId ||
    ["admin", "manager", "super_admin"].includes(currentUserRole);

  const handleDelete = () => {
    startTransition(async () => {
      await deleteComment(comment.id);
    });
  };

  const timeAgo = formatTimeAgo(comment.created_at);

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <Avatar className="h-7 w-7 shrink-0 mt-0.5">
          <AvatarImage src={comment.users?.avatar_url ?? undefined} />
          <AvatarFallback className="text-[10px]">
            {comment.users?.name?.charAt(0) ?? "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-medium text-foreground">
                {comment.users?.name ?? "不明"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {timeAgo}
              </span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">
              {comment.body}
            </p>
          </div>
          <div className="flex items-center gap-1 mt-0.5 ml-1">
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 rounded"
            >
              <Reply className="h-3 w-3" />
              返信
            </button>
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-danger transition-colors px-1 py-0.5 rounded"
              >
                <Trash2 className="h-3 w-3" />
                削除
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reply form */}
      {showReplyForm && (
        <div className="ml-10">
          <CommentForm
            entryId={entryId}
            parentId={comment.id}
            onCancel={() => setShowReplyForm(false)}
            onSubmitted={() => setShowReplyForm(false)}
            placeholder={`${comment.users?.name ?? ""}さんに返信...`}
            compact
          />
        </div>
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-10 space-y-2 border-l-2 border-border pl-3">
          {replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReplyItem(props: {
  comment: Comment;
  currentUserId: string;
  currentUserRole: string;
}) {
  const { comment, currentUserId, currentUserRole } = props;
  const [isPending, startTransition] = useTransition();
  const canDelete =
    comment.user_id === currentUserId ||
    ["admin", "manager", "super_admin"].includes(currentUserRole);

  const handleDelete = () => {
    startTransition(async () => {
      await deleteComment(comment.id);
    });
  };

  return (
    <div className="flex gap-3">
      <Avatar className="h-6 w-6 shrink-0 mt-0.5">
        <AvatarImage src={comment.users?.avatar_url ?? undefined} />
        <AvatarFallback className="text-[9px]">
          {comment.users?.name?.charAt(0) ?? "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="rounded-lg bg-muted/30 px-3 py-1.5">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-foreground">
              {comment.users?.name ?? "不明"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {formatTimeAgo(comment.created_at)}
            </span>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
            {comment.body}
          </p>
        </div>
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-danger transition-colors px-1 py-0.5 rounded mt-0.5 ml-1"
          >
            <Trash2 className="h-3 w-3" />
            削除
          </button>
        )}
      </div>
    </div>
  );
}

function CommentForm({
  entryId,
  parentId,
  onCancel,
  onSubmitted,
  placeholder = "コメントを入力...",
  compact = false,
}: {
  entryId: string;
  parentId?: string;
  onCancel: () => void;
  onSubmitted: () => void;
  placeholder?: string;
  compact?: boolean;
}) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!body.trim()) return;
    setError(null);

    const formData = new FormData();
    formData.set("entryId", entryId);
    formData.set("body", body.trim());
    if (parentId) formData.set("parentId", parentId);

    startTransition(async () => {
      const result = await addComment(formData);
      if (result.success) {
        setBody("");
        onSubmitted();
      } else {
        setError(result.error ?? "送信に失敗しました");
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={body}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
        className="text-sm resize-none"
        maxLength={2000}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          ⌘+Enter で送信
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
            className="text-xs"
          >
            キャンセル
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isPending || !body.trim()}
            className="text-xs gap-1"
          >
            <Send className="h-3 w-3" />
            {isPending ? "送信中..." : "送信"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}日前`;
  return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}
