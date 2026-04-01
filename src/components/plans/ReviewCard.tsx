"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, ClipboardCheck, MessageSquare, CheckCircle2 } from "lucide-react";
import { addManagerFeedback } from "@/app/(dashboard)/plans/actions";
import type { PlanReview } from "@/types/database";

interface ReviewCardProps {
  review: PlanReview;
  managerName?: string;
  isManager: boolean;
  planId: string;
}

export function ReviewCard({
  review,
  managerName,
  isManager,
  planId,
}: ReviewCardProps) {
  const [isPending, startTransition] = useTransition();
  const [feedbackText, setFeedbackText] = useState("");
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFeedback = () => {
    if (!feedbackText.trim()) return;

    setError(null);
    startTransition(async () => {
      const result = await addManagerFeedback({
        planId,
        comment: feedbackText,
      });

      if (result.success) {
        setFeedbackSent(true);
        setShowFeedbackForm(false);
      } else {
        setError(result.error ?? "エラーが発生しました");
      }
    });
  };

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          振り返り
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Self rating */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">自己評価:</span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                key={value}
                className={`h-4 w-4 ${
                  value <= (review.self_rating ?? 0)
                    ? "fill-warning text-warning"
                    : "text-slate-200"
                }`}
              />
            ))}
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {review.self_rating}/5
          </span>
        </div>

        {/* Review content */}
        {review.went_well && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-success">うまくいったこと</p>
            <p className="text-sm text-foreground whitespace-pre-wrap rounded-lg bg-success/3 p-3 border border-success/10">
              {review.went_well}
            </p>
          </div>
        )}

        {review.to_improve && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-warning">改善したいこと</p>
            <p className="text-sm text-foreground whitespace-pre-wrap rounded-lg bg-warning/3 p-3 border border-warning/10">
              {review.to_improve}
            </p>
          </div>
        )}

        {review.next_actions && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-primary">来週のアクション</p>
            <p className="text-sm text-foreground whitespace-pre-wrap rounded-lg bg-primary/3 p-3 border border-primary/10">
              {review.next_actions}
            </p>
          </div>
        )}

        {/* Manager feedback (existing) */}
        {(review.manager_comment || feedbackSent) && (
          <div className="space-y-1 border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-medium text-primary">
                マネージャーフィードバック
                {managerName && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({managerName})
                  </span>
                )}
              </p>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap rounded-lg bg-muted/50 p-3">
              {feedbackSent ? feedbackText : review.manager_comment}
            </p>
          </div>
        )}

        {/* Manager feedback form */}
        {isManager && !review.manager_comment && !feedbackSent && (
          <div className="border-t border-border pt-3">
            {!showFeedbackForm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFeedbackForm(true)}
                className="text-sm"
              >
                <MessageSquare className="mr-1.5 h-4 w-4" />
                フィードバックを書く
              </Button>
            ) : (
              <div className="space-y-3">
                <Textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="メンバーへのフィードバック..."
                  rows={3}
                  className="border-border resize-none text-sm"
                />
                {error && <p className="text-sm text-danger">{error}</p>}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleFeedback}
                    disabled={isPending || !feedbackText.trim()}
                    className="bg-primary hover:bg-primary-hover text-white"
                  >
                    {isPending ? "送信中..." : "送信"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFeedbackForm(false)}
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
