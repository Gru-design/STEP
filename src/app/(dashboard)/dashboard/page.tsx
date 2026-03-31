import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { User } from "@/types/database";

const roleLabels: Record<string, string> = {
  super_admin: "スーパーアドミン",
  admin: "管理者",
  manager: "マネージャー",
  member: "メンバー",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!dbUser) {
    redirect("/login");
  }

  const user = dbUser as User;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0C025F]">ダッシュボード</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          {user.name}さん ({roleLabels[user.role]})
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">日報</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#64748B]">
              日報の提出・確認ができます。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">週次計画</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#64748B]">
              週次計画の作成・管理ができます。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">目標管理</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#64748B]">
              目標ツリーの確認・進捗管理ができます。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">案件管理</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#64748B]">
              案件のファネル管理ができます。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">ナレッジ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#64748B]">
              チームのナレッジを共有・検索できます。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">週刊STEP</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#64748B]">
              週次ダイジェストを確認できます。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
