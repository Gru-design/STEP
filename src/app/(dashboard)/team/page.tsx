import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { User, Team, TeamMember } from "@/types/database";
import { TeamPageClient } from "./TeamPageClient";

interface TeamWithMembers extends Team {
  team_members: (TeamMember & {
    users: Pick<User, "id" | "name" | "email" | "role" | "avatar_url">;
  })[];
}

export default async function TeamPage() {
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
  const canManage = ["admin", "manager", "super_admin"].includes(user.role);

  // Fetch teams with members
  const { data: teams } = await supabase
    .from("teams")
    .select(
      `
      *,
      team_members (
        *,
        users (id, name, email, role, avatar_url)
      )
    `
    )
    .eq("tenant_id", user.tenant_id)
    .order("created_at", { ascending: true });

  // Fetch all users in tenant (for adding members)
  const { data: allUsers } = await supabase
    .from("users")
    .select("id, name, email, role, avatar_url")
    .eq("tenant_id", user.tenant_id)
    .order("name", { ascending: true });

  return (
    <TeamPageClient
      teams={(teams as TeamWithMembers[]) ?? []}
      allUsers={
        (allUsers as Pick<
          User,
          "id" | "name" | "email" | "role" | "avatar_url"
        >[]) ?? []
      }
      canManage={canManage}
    />
  );
}
