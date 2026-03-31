"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createTeamSchema } from "@/lib/validations";

export async function createTeam(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { success: false, error: "認証されていません" };
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("tenant_id, role")
    .eq("id", authUser.id)
    .single();

  if (!dbUser || !["admin", "manager", "super_admin"].includes(dbUser.role)) {
    return { success: false, error: "権限がありません" };
  }

  const parsed = createTeamSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const name = parsed.data.name;

  const { error } = await supabase.from("teams").insert({
    name: name.trim(),
    tenant_id: dbUser.tenant_id,
    manager_id: authUser.id,
  });

  if (error) {
    return { success: false, error: "チームの作成に失敗しました" };
  }

  revalidatePath("/team");
  return { success: true };
}

export async function addTeamMember(teamId: string, userId: string) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { success: false, error: "認証されていません" };
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("tenant_id, role")
    .eq("id", authUser.id)
    .single();

  if (!dbUser || !["admin", "manager", "super_admin"].includes(dbUser.role)) {
    return { success: false, error: "権限がありません" };
  }

  // Check if the user is already a member
  const { data: existingMember } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .single();

  if (existingMember) {
    return { success: false, error: "このユーザーは既にメンバーです" };
  }

  const { error } = await supabase.from("team_members").insert({
    team_id: teamId,
    user_id: userId,
    role: "member",
  });

  if (error) {
    return { success: false, error: "メンバーの追加に失敗しました" };
  }

  revalidatePath("/team");
  return { success: true };
}

export async function removeTeamMember(memberId: string) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { success: false, error: "認証されていません" };
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("tenant_id, role")
    .eq("id", authUser.id)
    .single();

  if (!dbUser || !["admin", "manager", "super_admin"].includes(dbUser.role)) {
    return { success: false, error: "権限がありません" };
  }

  // Verify team member belongs to user's tenant
  const { data: member } = await supabase
    .from("team_members")
    .select("team_id, teams!inner(tenant_id)")
    .eq("id", memberId)
    .single();

  if (!member || (member.teams as unknown as { tenant_id: string }).tenant_id !== dbUser.tenant_id) {
    return { success: false, error: "権限がありません" };
  }

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", memberId);

  if (error) {
    return { success: false, error: "メンバーの削除に失敗しました" };
  }

  revalidatePath("/team");
  return { success: true };
}
