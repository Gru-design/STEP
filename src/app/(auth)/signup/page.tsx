"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { signupAction } from "./actions";

export default function SignupPage() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signupAction({
        tenantName,
        name,
        email,
        password,
      });

      if (!result.success) {
        setError(result.error ?? "登録に失敗しました。");
        return;
      }

      // Sign in the user after successful signup
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Signup succeeded but auto-login failed - redirect to login
        router.push("/login");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("予期しないエラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">アカウントを作成</CardTitle>
        <CardDescription>
          チームの日報管理を始めましょう。
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
            <Label htmlFor="tenantName">テナント名（会社名）</Label>
            <Input
              id="tenantName"
              type="text"
              placeholder="株式会社サンプル"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">名前</Label>
            <Input
              id="name"
              type="text"
              placeholder="山田 太郎"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
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
              placeholder="8文字以上"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "登録中..." : "アカウントを作成"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            既にアカウントをお持ちの方は{" "}
            <Link
              href="/login"
              className="text-accent-color hover:underline"
            >
              ログインはこちら
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
