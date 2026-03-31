"use client";

import { useState } from "react";
import Link from "next/link";
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/callback`,
        }
      );

      if (resetError) {
        setError("パスワードリセットメールの送信に失敗しました。もう一度お試しください。");
        return;
      }

      setSuccess(true);
    } catch {
      setError("予期しないエラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">メールを送信しました</CardTitle>
          <CardDescription>
            パスワードリセット用のリンクを送信しました。メールをご確認ください。
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full">
              ログインに戻る
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">パスワードをリセット</CardTitle>
        <CardDescription>
          登録済みのメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。
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
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "送信中..." : "リセットメールを送信"}
          </Button>
          <Link
            href="/login"
            className="text-center text-sm text-accent-color hover:underline"
          >
            ログインに戻る
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
