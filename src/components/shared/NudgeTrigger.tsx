"use client";

import { useEffect } from "react";

/**
 * 非表示コンポーネント: ダッシュボードアクセス時にナッジ処理をトリガー。
 * Vercel Free プランでの cron 制限を補完する。
 */
export function NudgeTrigger() {
  useEffect(() => {
    // セッション中1回だけ実行
    const key = `nudge_triggered_${new Date().toISOString().slice(0, 13)}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    fetch("/api/trigger/nudge", { method: "POST" }).catch(() => {
      // 失敗してもUI に影響させない
    });
  }, []);

  return null;
}
