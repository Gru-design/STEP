"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserPlus, Trash2 } from "lucide-react";
import { inviteUser, updateUserRole, deactivateUser } from "./actions";
import type { Role } from "@/types/database";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface UserManagementClientProps {
  users: UserRow[];
  tenantId: string;
}

const roleLabels: Record<string, string> = {
  super_admin: "スーパーアドミン",
  admin: "管理者",
  manager: "マネージャー",
  member: "メンバー",
};

const roleBadgeColors: Record<string, string> = {
  admin: "bg-primary-light text-primary",
  manager: "bg-amber-50 text-warning",
  member: "bg-muted text-muted-foreground",
};

export function UserManagementClient({
  users: initialUsers,
}: UserManagementClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);

  async function handleInvite() {
    setLoading(true);
    setError(null);
    const result = await inviteUser(inviteEmail, inviteName, inviteRole);
    if (result.success && result.user) {
      setUsers((prev) => [...prev, result.user!]);
      setShowInvite(false);
      setCreatedCredentials({
        name: inviteName,
        email: inviteEmail,
        password: result.user.tempPassword,
      });
      setInviteEmail("");
      setInviteName("");
    } else {
      setError(result.error ?? "招待に失敗しました");
    }
    setLoading(false);
  }

  async function handleRoleChange(userId: string, newRole: Role) {
    const result = await updateUserRole(userId, newRole);
    if (result.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    }
  }

  async function handleDeactivate(userId: string, userName: string) {
    if (!confirm(`${userName} を無効化しますか？この操作は取り消せません。`)) return;
    const result = await deactivateUser(userId);
    if (result.success) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    }
  }

  return (
    <div className="space-y-4">
      {/* Created credentials dialog */}
      {createdCredentials && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl border border-border w-full max-w-md p-6 shadow-lg">
            <h3 className="text-lg font-bold text-foreground mb-2">
              ユーザーを作成しました
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              以下のログイン情報を本人に共有してください。このダイアログを閉じるとパスワードは再表示できません。
            </p>
            <div className="space-y-3 bg-muted rounded-lg p-4 border border-border">
              <div>
                <p className="text-xs text-muted-foreground">名前</p>
                <p className="font-medium text-foreground">{createdCredentials.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">メールアドレス</p>
                <p className="font-mono text-foreground">{createdCredentials.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">初期パスワード</p>
                <p className="font-mono text-foreground select-all">{createdCredentials.password}</p>
              </div>
            </div>
            <p className="text-xs text-danger mt-3">
              ※ 初回ログイン後、パスワードの変更を推奨します。
            </p>
            <div className="flex gap-3 mt-4 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `名前: ${createdCredentials.name}\nメール: ${createdCredentials.email}\nパスワード: ${createdCredentials.password}`
                  );
                  setSuccess("クリップボードにコピーしました");
                  setTimeout(() => setSuccess(null), 3000);
                }}
              >
                コピー
              </Button>
              <Button size="sm" onClick={() => setCreatedCredentials(null)}>
                閉じる
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
          {success}
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{users.length} ユーザー</p>
        <Button
          size="sm"
          className="gap-2"
          onClick={() => setShowInvite(!showInvite)}
        >
          <UserPlus className="h-4 w-4" />
          ユーザーを招待
        </Button>
      </div>

      {showInvite && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">新規ユーザー招待</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="invite-name">名前</Label>
                <Input
                  id="invite-name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="山田太郎"
                />
              </div>
              <div>
                <Label htmlFor="invite-email">メールアドレス</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="yamada@example.com"
                />
              </div>
            </div>
            <div>
              <Label>ロール</Label>
              <div className="flex gap-2 mt-1">
                {(["member", "manager", "admin"] as Role[]).map((r) => (
                  <Button
                    key={r}
                    type="button"
                    size="sm"
                    variant={inviteRole === r ? "default" : "outline"}
                    onClick={() => setInviteRole(r)}
                  >
                    {roleLabels[r]}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleInvite} disabled={loading || !inviteEmail || !inviteName}>
                {loading ? "招待中..." : "招待する"}
              </Button>
              <Button variant="outline" onClick={() => setShowInvite(false)}>
                キャンセル
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="divide-y divide-border rounded-xl border border-border">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground truncate">
                  {user.name}
                </span>
                <Badge className={`text-xs ${roleBadgeColors[user.role] ?? ""}`}>
                  {roleLabels[user.role] ?? user.role}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {user.role === "super_admin" ? (
                <span className="text-xs text-muted-foreground px-2">変更不可</span>
              ) : (
                <>
                  <select
                    value={user.role}
                    onChange={(e) =>
                      handleRoleChange(user.id, e.target.value as Role)
                    }
                    className="rounded border border-border bg-white px-2 py-1 text-xs text-foreground"
                  >
                    <option value="member">メンバー</option>
                    <option value="manager">マネージャー</option>
                    <option value="admin">管理者</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-danger"
                    onClick={() => handleDeactivate(user.id, user.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
