"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Radix UI Select は value="" を禁止している。
 * このコンポーネントは「なし（未選択）」をセンチネル値で安全に扱い、
 * 外部には null として公開する。
 *
 * - FormData 経由: name prop を渡すと hidden input が生成される。
 *   FormData からの取得には parseOptionalSelect() を使う。
 * - Controlled: value / onValueChange で null を扱える。
 */

/** FormData に入るセンチネル値。UUID と衝突しない固定文字列。 */
export const NONE_SENTINEL = "__none__";

/** FormData から optional select の値を取り出すユーティリティ */
export function parseOptionalSelect(
  formData: FormData,
  key: string
): string | undefined {
  const v = formData.get(key) as string | null;
  if (!v || v === NONE_SENTINEL) return undefined;
  return v;
}

interface OptionalSelectProps {
  /** フォーム送信用の name 属性 */
  name?: string;
  /** プレースホルダーテキスト */
  placeholder?: string;
  /** 「なし」オプションのラベル（デフォルト: "なし"） */
  noneLabel?: string;
  /** Controlled: 現在の値（null = 未選択） */
  value?: string | null;
  /** Uncontrolled: 初期値 */
  defaultValue?: string | null;
  /** Controlled: 値変更コールバック */
  onValueChange?: (value: string | null) => void;
  /** 子要素（SelectItem のリスト） */
  children: React.ReactNode;
  /** 無効状態 */
  disabled?: boolean;
}

export function OptionalSelect({
  name,
  placeholder,
  noneLabel = "なし",
  value,
  defaultValue,
  onValueChange,
  children,
  disabled,
}: OptionalSelectProps) {
  const isControlled = value !== undefined;

  const handleChange = (v: string) => {
    if (!onValueChange) return;
    onValueChange(v === NONE_SENTINEL ? null : v);
  };

  return (
    <Select
      name={name}
      disabled={disabled}
      {...(isControlled
        ? { value: value ?? NONE_SENTINEL, onValueChange: handleChange }
        : {
            defaultValue: defaultValue ?? NONE_SENTINEL,
            onValueChange: onValueChange ? handleChange : undefined,
          })}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_SENTINEL}>{noneLabel}</SelectItem>
        {children}
      </SelectContent>
    </Select>
  );
}
