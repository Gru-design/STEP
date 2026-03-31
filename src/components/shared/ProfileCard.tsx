import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Phone, MessageSquare, Calendar, Mail } from "lucide-react";
import type { User, Role } from "@/types/database";

const roleLabels: Record<Role, string> = {
  super_admin: "スーパーアドミン",
  admin: "管理者",
  manager: "マネージャー",
  member: "メンバー",
};

const roleBadgeColors: Record<Role, string> = {
  super_admin: "bg-[#DC2626] text-white",
  admin: "bg-[#0C025F] text-white",
  manager: "bg-[#2563EB] text-white",
  member: "bg-[#F0F4FF] text-[#0C025F]",
};

interface ProfileCardProps {
  user: User;
  teamName?: string;
}

export function ProfileCard({ user, teamName }: ProfileCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar_url ?? undefined} />
            <AvatarFallback className="text-lg font-medium">
              {user.name?.charAt(0) ?? "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <div>
              <h3 className="text-lg font-semibold text-[#1E293B]">
                {user.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    roleBadgeColors[user.role]
                  }`}
                >
                  {roleLabels[user.role]}
                </span>
                {teamName && (
                  <span className="text-xs text-[#64748B]">{teamName}</span>
                )}
              </div>
            </div>

            {user.bio && (
              <p className="text-sm text-[#64748B]">{user.bio}</p>
            )}

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              {user.phone && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`tel:${user.phone}`}>
                    <Phone className="mr-1 h-3.5 w-3.5" />
                    電話
                  </a>
                </Button>
              )}

              {user.slack_id && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`slack://user?team=&id=${user.slack_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageSquare className="mr-1 h-3.5 w-3.5" />
                    Slack
                  </a>
                </Button>
              )}

              {user.calendar_url && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={user.calendar_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Calendar className="mr-1 h-3.5 w-3.5" />
                    1on1予約
                  </a>
                </Button>
              )}

              {user.email && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${user.email}`}>
                    <Mail className="mr-1 h-3.5 w-3.5" />
                    メール
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
