"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, UserPlus, X } from "lucide-react";
import { createTeam, addTeamMember, removeTeamMember } from "./actions";
import type { User, Team, TeamMember } from "@/types/database";

interface TeamWithMembers extends Team {
  team_members: (TeamMember & {
    users: Pick<User, "id" | "name" | "email" | "role" | "avatar_url">;
  })[];
}

const roleLabels: Record<string, string> = {
  super_admin: "スーパーアドミン",
  admin: "管理者",
  manager: "マネージャー",
  member: "メンバー",
};

interface TeamPageClientProps {
  teams: TeamWithMembers[];
  allUsers: Pick<User, "id" | "name" | "email" | "role" | "avatar_url">[];
  canManage: boolean;
}

export function TeamPageClient({
  teams,
  allUsers,
  canManage,
}: TeamPageClientProps) {
  const [isPending, startTransition] = useTransition();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addMemberDialogTeamId, setAddMemberDialogTeamId] = useState<
    string | null
  >(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleCreateTeam = async (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await createTeam(formData);
      if (result.success) {
        setCreateDialogOpen(false);
      } else {
        setError(result.error ?? "エラーが発生しました");
      }
    });
  };

  const handleAddMember = () => {
    if (!addMemberDialogTeamId || !selectedUserId) return;
    setError(null);
    startTransition(async () => {
      const result = await addTeamMember(addMemberDialogTeamId, selectedUserId);
      if (result.success) {
        setAddMemberDialogTeamId(null);
        setSelectedUserId("");
      } else {
        setError(result.error ?? "エラーが発生しました");
      }
    });
  };

  const handleRemoveMember = (memberId: string) => {
    startTransition(async () => {
      const result = await removeTeamMember(memberId);
      if (!result.success) {
        setError(result.error ?? "エラーが発生しました");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">チーム</h1>
        {canManage && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                チーム作成
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新しいチームを作成</DialogTitle>
              </DialogHeader>
              <form action={handleCreateTeam}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="team-name">チーム名</Label>
                    <Input
                      id="team-name"
                      name="name"
                      placeholder="チーム名を入力"
                      required
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-danger">{error}</p>
                  )}
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      キャンセル
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "作成中..." : "作成"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error && !createDialogOpen && !addMemberDialogTeamId && (
        <p className="text-sm text-danger">{error}</p>
      )}

      {teams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">チームがまだありません。</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold">
                  {team.name}
                </CardTitle>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAddMemberDialogTeamId(team.id);
                      setSelectedUserId("");
                      setError(null);
                    }}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  {team.team_members.length}名のメンバー
                </p>
                <div className="space-y-2">
                  {team.team_members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage
                            src={member.users.avatar_url ?? undefined}
                          />
                          <AvatarFallback className="text-xs">
                            {member.users.name?.charAt(0) ?? "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {member.users.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {roleLabels[member.users.role] ?? member.users.role}
                          </p>
                        </div>
                      </div>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={isPending}
                        >
                          <X className="h-3 w-3" />
                          <span className="sr-only">削除</span>
                        </Button>
                      )}
                    </div>
                  ))}
                  {team.team_members.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">
                      メンバーがいません
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add member dialog */}
      <Dialog
        open={!!addMemberDialogTeamId}
        onOpenChange={(open) => {
          if (!open) {
            setAddMemberDialogTeamId(null);
            setSelectedUserId("");
            setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>メンバーを追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ユーザーを選択</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="ユーザーを選択" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddMemberDialogTeamId(null);
                setSelectedUserId("");
                setError(null);
              }}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={isPending || !selectedUserId}
            >
              {isPending ? "追加中..." : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
