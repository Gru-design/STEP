"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, ClipboardCheck, Zap } from "lucide-react";
import { submitReview } from "@/app/(dashboard)/plans/actions";

interface WeeklyReviewFormProps {
  planId: string;
  weekRange: string;
  executionRate: number | null;
  onSubmitted?: () => void;
}

export function WeeklyReviewForm({
  planId,
  weekRange,
  executionRate,
  onSubmitted,
}: WeeklyReviewFormProps) {
  const [isPending, startTransition] = useTransition();
  const [selfRating, setSelfRating] = useState(0);
  const [wentWell, setWentWell] = useState("");
  const [toImprove, setToImprove] = useState("");
  const [nextActions, setNextActions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (selfRating === 0) {
      setError("自己評価を選択してください");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await submitReview({
        planId,
        selfRating,
        wentWell,
        toImprove,
        nextActions,
      });

      if (result.success) {
        setSubmitted(true);
        onSubmitted?.();
      } else {
        setError(result.error ?? "エラーが発生しました");
      }
    });
  };

  if (submitted) {
    return (
      <Card className="border-success/20 bg-success/3">
        <CardContent className="flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10">
            <ClipboardCheck className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="font-semibold text-success">振り返りを提出しました</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="h-3 w-3 text-accent-color" />
              +10 XP 獲得！
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          振り返り
        </CardTitle>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{weekRange}</span>
          {executionRate !== null && (
            <span className="font-mono">
              実行率: {Math.round(executionRate)}%
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Execution rate bar */}
        {executionRate !== null && (
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full motion-safe:transition-all duration-500"
              style={{
                width: `${Math.min(100, executionRate)}%`,
                background:
                  executionRate >= 80
                    ? "var(--color-success)"
                    : executionRate >= 50
                    ? "var(--color-primary)"
                    : "var(--color-warning)",
              }}
            />
          </div>
        )}

        {/* Self rating */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            自己評価 <span className="text-danger">*</span>
          </Label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelfRating(value === selfRating ? 0 : value)}
                className="rounded p-1 motion-safe:transition-colors hover:bg-muted active:scale-90"
              >
                <Star
                  className={`h-7 w-7 ${
                    value <= selfRating
                      ? "fill-warning text-warning"
                      : "text-slate-200 hover:text-warning/50"
                  }`}
                />
              </button>
            ))}
            {selfRating > 0 && (
              <span className="ml-2 font-mono text-sm text-muted-foreground">
                {selfRating}/5
              </span>
            )}
          </div>
        </div>

        {/* Went well */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">うまくいったこと</Label>
          <Textarea
            value={wentWell}
            onChange={(e) => setWentWell(e.target.value)}
            placeholder="具体的な成果や良かった行動..."
            rows={2}
            className="border-border resize-none text-sm"
          />
        </div>

        {/* To improve */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">改善したいこと</Label>
          <Textarea
            value={toImprove}
            onChange={(e) => setToImprove(e.target.value)}
            placeholder="次に活かしたい反省点..."
            rows={2}
            className="border-border resize-none text-sm"
          />
        </div>

        {/* Next actions */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">来週のアクション</Label>
          <Textarea
            value={nextActions}
            onChange={(e) => setNextActions(e.target.value)}
            placeholder="具体的に何をするか..."
            rows={2}
            className="border-border resize-none text-sm"
          />
        </div>

        {error && (
          <p className="text-sm text-danger">{error}</p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isPending || selfRating === 0}
          className="w-full bg-primary hover:bg-primary-hover text-white h-11"
        >
          {isPending ? "送信中..." : "振り返りを提出する"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          提出すると <span className="font-medium text-accent-color">+10 XP</span> 獲得
        </p>
      </CardContent>
    </Card>
  );
}
