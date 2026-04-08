import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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
    .select("id, tenant_id, role, name, email, avatar_url")
    .eq("id", authUser.id)
    .single();

  if (!dbUser) {
    redirect("/login");
  }

  const user = dbUser as User;
  const canManage = ["admin", "manager", "super_admin"].includes(user.role);

  // Fetch teams with members (limited) + all users in parallel
  const [teamsResult, allUsersResult] = await Promise.all([
    supabase
      .from("teams")
      .select(
        `
        id, tenant_id, name, manager_id, parent_team_id, created_at,
        team_members (
          id, team_id, user_id, tenant_id, role, created_at,
          users (id, name, email, role, avatar_url)
        )
      `
      )
      .eq("tenant_id", user.tenant_id)
      .order("created_at", { ascending: true })
      .limit(50),
    supabase
      .from("users")
      .select("id, name, email, role, avatar_url")
      .eq("tenant_id", user.tenant_id)
      .order("name", { ascending: true })
      .limit(200),
  ]);

  const teams = teamsResult.data;
  const allUsers = allUsersResult.data;

  return (
    <TeamPageClient
      teams={(teams as unknown as TeamWithMembers[]) ?? []}
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
