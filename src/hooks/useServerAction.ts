"use client";

import { useState, useTransition, useCallback } from "react";

/**
 * サーバーアクションの標準戻り値型。
 * 全 server action はこの形式に従う。
 */
export interface ServerActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

interface UseServerActionOptions<T> {
  /** 成功時コールバック */
  onSuccess?: (data?: T) => void;
  /** エラー時コールバック（toast 表示等に利用） */
  onError?: (error: string) => void;
}

/**
 * サーバーアクション呼び出しを標準化するフック。
 *
 * 統一する責務:
 * - loading state (useTransition ベースで UI ブロックしない)
 * - error state (inline 表示用。toast は onError コールバックで対応)
 * - try/catch (ネットワークエラー等の未捕捉例外も安全に処理)
 * - 生エラーメッセージのユーザー露出を防止
 *
 * @example
 * ```tsx
 * const { execute, isPending, error } = useServerAction(createGoal, {
 *   onSuccess: () => setDialogOpen(false),
 * });
 *
 * <form onSubmit={(e) => { e.preventDefault(); execute(input); }}>
 *   {error && <p className="text-danger">{error}</p>}
 *   <Button disabled={isPending}>
 *     {isPending ? "処理中..." : "作成"}
 *   </Button>
 * </form>
 * ```
 */
export function useServerAction<TInput, TData = void>(
  action: (input: TInput) => Promise<ServerActionResult<TData>>,
  options?: UseServerActionOptions<TData>
) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    (input: TInput) => {
      setError(null);
      startTransition(async () => {
        try {
          const result = await action(input);
          if (result.success) {
            options?.onSuccess?.(result.data);
          } else {
            const msg = result.error ?? "エラーが発生しました";
            setError(msg);
            options?.onError?.(msg);
          }
        } catch {
          const msg = "予期しないエラーが発生しました";
          setError(msg);
          options?.onError?.(msg);
        }
      });
    },
    [action, options]
  );

  const clearError = useCallback(() => setError(null), []);

  return { execute, isPending, error, clearError };
}
