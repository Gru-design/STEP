"use client";

import React, { useState, useTransition } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createFeatureRequest } from "@/app/(dashboard)/feature-requests/actions";

const CATEGORIES = [
  { value: "bug", label: "不具合報告", color: "bg-danger/10 text-danger" },
  { value: "feature", label: "新機能", color: "bg-primary/10 text-primary" },
  { value: "improvement", label: "改善要望", color: "bg-warning/10 text-warning" },
  { value: "other", label: "その他", color: "bg-muted text-muted-foreground" },
] as const;

interface FeatureRequestDialogProps {
  variant?: "sidebar" | "icon";
}

export function FeatureRequestDialog({ variant = "sidebar" }: FeatureRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("improvement");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = (formData: FormData) => {
    formData.set("category", category);
    setMessage(null);

    startTransition(async () => {
      const result = await createFeatureRequest(formData);
      if (result.success) {
        setMessage({ type: "success", text: "リクエストを送信しました！" });
        setTimeout(() => {
          setOpen(false);
          setMessage(null);
          setCategory("improvement");
        }, 1500);
      } else {
        setMessage({ type: "error", text: result.error ?? "送信に失敗しました" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "sidebar" ? (
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <MessageSquarePlus className="h-4 w-4" />
            <span>改善リクエスト</span>
          </button>
        ) : (
          <Button variant="ghost" size="sm" className="gap-2">
            <MessageSquarePlus className="h-4 w-4" />
            改善リクエスト
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>改善リクエスト</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          {/* Category */}
          <div className="space-y-2">
            <Label>カテゴリ</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    category === cat.value
                      ? cat.color + " ring-2 ring-offset-1 ring-current"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="fr-title">タイトル</Label>
            <Input
              id="fr-title"
              name="title"
              required
              placeholder="例: 日報の一括エクスポート機能がほしい"
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="fr-description">詳細（任意）</Label>
            <Textarea
              id="fr-description"
              name="description"
              placeholder="どんな場面で必要か、どうなると嬉しいかを教えてください"
              rows={4}
              maxLength={2000}
            />
          </div>

          {message && (
            <p
              className={`text-sm ${
                message.type === "success" ? "text-success" : "text-danger"
              }`}
            >
              {message.text}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "送信中..." : "送信"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
