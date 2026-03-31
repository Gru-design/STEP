"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Auth Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-4">
      <div className="mx-auto max-w-md text-center">
        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-danger" />
        <h2 className="mb-2 text-lg font-bold text-foreground">
          エラーが発生しました
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          認証処理中にエラーが発生しました。もう一度お試しください。
        </p>
        <Button onClick={reset}>再試行</Button>
      </div>
    </div>
  );
}
