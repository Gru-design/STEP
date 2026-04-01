"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendSlackNotification } from "@/lib/integrations/slack";
import { sendChatworkMessage } from "@/lib/integrations/chatwork";

type IntegrationProvider = "google_calendar" | "gmail" | "slack" | "chatwork" | "teams" | "cti";

interface SaveIntegrationInput {
  provider: IntegrationProvider;
  credentials: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export async function saveIntegration(data: SaveIntegrationInput) {
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

  if (!dbUser || !["admin", "super_admin"].includes(dbUser.role)) {
    return { success: false, error: "権限がありません" };
  }

  const validProviders: IntegrationProvider[] = [
    "google_calendar",
    "gmail",
    "slack",
    "chatwork",
    "teams",
    "cti",
  ];
  if (!validProviders.includes(data.provider)) {
    return { success: false, error: "無効なプロバイダーです" };
  }

  // Check if integration already exists for this tenant + provider
  const { data: existing } = await supabase
    .from("integrations")
    .select("id")
    .eq("tenant_id", dbUser.tenant_id)
    .eq("provider", data.provider)
    .single();

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from("integrations")
      .update({
        credentials: data.credentials,
        settings: data.settings || {},
        status: "active",
      })
      .eq("id", existing.id);

    if (error) {
      return { success: false, error: "連携設定の更新に失敗しました" };
    }
  } else {
    // Insert new
    const { error } = await supabase.from("integrations").insert({
      tenant_id: dbUser.tenant_id,
      provider: data.provider,
      credentials: data.credentials,
      settings: data.settings || {},
      status: "active",
    });

    if (error) {
      return { success: false, error: "連携設定の保存に失敗しました" };
    }
  }

  revalidatePath("/settings/integrations");
  return { success: true };
}

export async function deleteIntegration(id: string) {
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

  if (!dbUser || !["admin", "super_admin"].includes(dbUser.role)) {
    return { success: false, error: "権限がありません" };
  }

  const { error } = await supabase
    .from("integrations")
    .delete()
    .eq("id", id)
    .eq("tenant_id", dbUser.tenant_id);

  if (error) {
    return { success: false, error: "連携設定の削除に失敗しました" };
  }

  revalidatePath("/settings/integrations");
  return { success: true };
}

export async function toggleIntegrationStatus(id: string, active: boolean) {
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

  if (!dbUser || !["admin", "super_admin"].includes(dbUser.role)) {
    return { success: false, error: "権限がありません" };
  }

  const { error } = await supabase
    .from("integrations")
    .update({ status: active ? "active" : "inactive" })
    .eq("id", id)
    .eq("tenant_id", dbUser.tenant_id);

  if (error) {
    return { success: false, error: "ステータスの更新に失敗しました" };
  }

  revalidatePath("/settings/integrations");
  return { success: true };
}

export async function testSlackWebhook(webhookUrl: string) {
  // 認証チェック（SSRF 防止）
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "認証が必要です" };

  if (!webhookUrl || !webhookUrl.startsWith("https://hooks.slack.com/")) {
    return { success: false, error: "有効なSlack Webhook URLを入力してください" };
  }

  const result = await sendSlackNotification(webhookUrl, {
    text: "STEP からのテスト通知です。連携が正常に設定されました！ ✅",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*STEP 連携テスト*\nSlack連携が正常に設定されました。日報提出やリマインダーの通知がこのチャンネルに届きます。",
        },
      },
    ],
  });

  return result;
}

export async function testChatworkConnection(apiToken: string, roomId: string) {
  // 認証チェック
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "認証が必要です" };

  if (!apiToken || !roomId) {
    return { success: false, error: "APIトークンとルームIDを入力してください" };
  }

  const result = await sendChatworkMessage(
    apiToken,
    roomId,
    "[info][title]STEP 連携テスト[/title]Chatwork連携が正常に設定されました。日報提出やリマインダーの通知がこのルームに届きます。[/info]"
  );

  return result;
}
