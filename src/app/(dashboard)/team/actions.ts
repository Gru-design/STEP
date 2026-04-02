"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createTeamSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";

export async function createTeam(formData: FormData) {
  try {
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

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: authUser.id,
      action: "create",
      resource: "team",
      details: { name: name.trim() },
    });

    revalidatePath("/team");
    return { success: true };
  } catch (err) {
    console.error("[Team] createTeam unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function addTeamMember(teamId: string, userId: string) {
  try {
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

    // チームとユーザーが同一テナントに属するか検証
    const { data: team } = await supabase
      .from("teams")
      .select("id")
      .eq("id", teamId)
      .eq("tenant_id", dbUser.tenant_id)
      .single();

    if (!team) {
      return { success: false, error: "チームが見つかりません" };
    }

    const { data: targetUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .eq("tenant_id", dbUser.tenant_id)
      .single();

    if (!targetUser) {
      return { success: false, error: "ユーザーが見つかりません" };
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

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: authUser.id,
      action: "create",
      resource: "team_member",
      details: { teamId, memberId: userId },
    });

    revalidatePath("/team");
    return { success: true };
  } catch (err) {
    console.error("[Team] addTeamMember unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function removeTeamMember(memberId: string) {
  try {
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
      .select("id")
      .eq("id", memberId)
      .eq("tenant_id", dbUser.tenant_id)
      .single();

    if (!member) {
      return { success: false, error: "権限がありません" };
    }

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      return { success: false, error: "メンバーの削除に失敗しました" };
    }

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: authUser.id,
      action: "delete",
      resource: "team_member",
      resourceId: memberId,
    });

    revalidatePath("/team");
    return { success: true };
  } catch (err) {
    console.error("[Team] removeTeamMember unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}
