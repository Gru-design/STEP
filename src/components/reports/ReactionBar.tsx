"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle } from "lucide-react";
import { addReaction, removeReaction } from "@/app/(dashboard)/reports/actions";
import type { Reaction, ReactionType } from "@/types/database";

const REACTION_EMOJIS: { type: ReactionType; emoji: string; label: string }[] =
  [
    { type: "like", emoji: "\u{1F44D}", label: "いいね" },
    { type: "fire", emoji: "\u{1F525}", label: "最高" },
    { type: "clap", emoji: "\u{1F44F}", label: "拍手" },
    { type: "heart", emoji: "\u{2764}\u{FE0F}", label: "ハート" },
    { type: "eyes", emoji: "\u{1F440}", label: "注目" },
  ];

interface ReactionBarProps {
  entryId: string;
  reactions: Reaction[];
  currentUserId: string;
}

export function ReactionBar({
  entryId,
  reactions,
  currentUserId,
}: ReactionBarProps) {
  const [isPending, startTransition] = useTransition();
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comment, setComment] = useState("");

  const getReactionCount = (type: ReactionType): number =>
    reactions.filter((r) => r.type === type).length;

  const getUserReaction = (type: ReactionType): Reaction | undefined =>
    reactions.find((r) => r.type === type && r.user_id === currentUserId);

  const handleReaction = (type: ReactionType) => {
    const existing = getUserReaction(type);
    startTransition(async () => {
      if (existing) {
        await removeReaction(existing.id);
      } else {
        await addReaction(entryId, type);
      }
    });
  };

  const handleCommentSubmit = () => {
    if (!comment.trim()) return;
    startTransition(async () => {
      await addReaction(entryId, "like", comment.trim());
      setComment("");
      setShowCommentInput(false);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {REACTION_EMOJIS.map(({ type, emoji, label }) => {
          const count = getReactionCount(type);
          const isActive = !!getUserReaction(type);

          return (
            <Button
              key={type}
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => handleReaction(type)}
              className={`h-8 gap-1 border-border px-2.5 text-sm ${
                isActive
                  ? "bg-muted border-accent-color text-accent-color"
                  : "hover:bg-muted"
              }`}
              title={label}
            >
              <span>{emoji}</span>
              {count > 0 && (
                <span className="font-mono text-xs">{count}</span>
              )}
            </Button>
          );
        })}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowCommentInput(!showCommentInput)}
          className="h-8 text-muted-foreground hover:text-foreground"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
      </div>

      {showCommentInput && (
        <div className="flex items-center gap-2">
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="コメントを入力..."
            className="border-border text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCommentSubmit();
            }}
          />
          <Button
            type="button"
            size="sm"
            disabled={isPending || !comment.trim()}
            onClick={handleCommentSubmit}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            送信
          </Button>
        </div>
      )}

      {reactions.filter((r) => r.comment).length > 0 && (
        <div className="space-y-2 pl-2 border-l-2 border-border">
          {reactions
            .filter((r) => r.comment)
            .map((r) => (
              <div key={r.id} className="text-sm">
                <span className="text-muted-foreground">
                  {REACTION_EMOJIS.find((e) => e.type === r.type)?.emoji}{" "}
                </span>
                <span className="text-foreground">{r.comment}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
