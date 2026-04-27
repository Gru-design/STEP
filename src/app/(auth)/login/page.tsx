"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("error");
    if (!code) return;
    if (code === "auth_callback_failed") {
      setError(
        "パスワードリセットリンクの確認に失敗しました。リンクの有効期限が切れているか、別のブラウザで開かれた可能性があります。再度リセットメールを送信してください。"
      );
    } else if (code === "auth_callback_missing") {
      setError(
        "認証情報が見つかりませんでした。パスワードリセットメールを再送し、メール本文のリンクを直接クリックしてください。"
      );
    } else if (code === "no_user_record") {
      setError(
        "アカウント情報が見つかりません。管理者にお問い合わせください。"
      );
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          setError("メールアドレスまたはパスワードが正しくありません。");
        } else if (signInError.message.includes("Email not confirmed")) {
          setError("メールアドレスの確認が完了していません。受信トレイをご確認ください。");
        } else {
          setError("ログインに失敗しました。もう一度お試しください。");
        }
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setError("予期しないエラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">ログイン</CardTitle>
        <CardDescription>
          メールアドレスとパスワードを入力してください。
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              placeholder="パスワードを入力"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-sm text-accent-color hover:underline"
            >
              パスワードを忘れた方
            </Link>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "ログイン中..." : "ログイン"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            アカウントをお持ちでない方は{" "}
            <Link
              href="/signup"
              className="text-accent-color hover:underline"
            >
              アカウントを作成
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
