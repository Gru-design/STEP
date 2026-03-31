"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]", error);
  }, [error]);

  return (
    <html lang="ja">
      <body className="flex min-h-screen items-center justify-center bg-white p-4">
        <div className="mx-auto max-w-md text-center">
          <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            予期しないエラー
          </h1>
          <p className="mb-6 text-sm text-gray-500">
            アプリケーションで重大なエラーが発生しました。再読み込みをお試しください。
          </p>
          {error.digest && (
            <p className="mb-4 font-mono text-xs text-gray-400">
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            再読み込み
          </button>
        </div>
      </body>
    </html>
  );
}
