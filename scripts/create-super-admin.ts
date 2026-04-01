/**
 * SuperAdmin アカウント作成スクリプト
 *
 * 実行方法:
 *   npx tsx scripts/create-super-admin.ts
 *
 * 事前条件:
 *   - .env.local に NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY が設定されていること
 *   - マイグレーションが実行済みであること
 *
 * 注意:
 *   - super_admin は運営者専用ロールです。1アカウントのみ作成を想定しています。
 *   - このスクリプトは初回セットアップ時に1回だけ実行してください。
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ .env.local の SUPABASE_URL / SERVICE_ROLE_KEY が未設定です");
  process.exit(1);
}

// ── 設定: ここを書き換えてください ──
const SUPER_ADMIN = {
  email: "admin@example.com", // ← あなたのメールアドレスに変更
  password: "ChangeMe2024!", // ← 初回ログイン後に必ず変更してください
  name: "Super Admin",
};

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("🔧 SuperAdmin アカウントを作成します...\n");

  // 1. 運営用テナントを作成 (super_admin の所属先)
  const { data: existingTenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("name", "STEP運営")
    .single();

  let tenantId: string;

  if (existingTenant) {
    tenantId = existingTenant.id;
    console.log(`✅ 既存の運営テナントを使用: ${tenantId}`);
  } else {
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        name: "STEP運営",
        plan: "enterprise",
        report_visibility: "tenant_all",
      })
      .select()
      .single();

    if (tenantError) {
      console.error("❌ テナント作成失敗:", tenantError.message);
      process.exit(1);
    }

    tenantId = tenant.id;
    console.log(`✅ 運営テナント作成: ${tenantId}`);
  }

  // 2. 既存ユーザーチェック
  const { data: existingUsers } = await supabase
    .from("users")
    .select("id, email, role")
    .eq("role", "super_admin");

  if (existingUsers && existingUsers.length > 0) {
    console.log("\n⚠️  既に super_admin が存在します:");
    for (const u of existingUsers) {
      console.log(`   - ${u.email} (${u.id})`);
    }
    console.log("\n既存アカウントを使用してください。中断します。");
    process.exit(0);
  }

  // 3. Supabase Auth ユーザー作成
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: SUPER_ADMIN.email,
      password: SUPER_ADMIN.password,
      email_confirm: true,
      user_metadata: {
        tenant_id: tenantId,
        name: SUPER_ADMIN.name,
        role: "super_admin",
      },
    });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      console.error("❌ このメールアドレスは既に登録されています:", SUPER_ADMIN.email);
      console.log("   → Supabase Dashboard で該当ユーザーの role を super_admin に変更してください。");
    } else {
      console.error("❌ Auth ユーザー作成失敗:", authError.message);
    }
    process.exit(1);
  }

  const userId = authData.user.id;

  // 4. users テーブルにレコード作成 (トリガーで作成済みの場合は更新)
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .single();

  if (existingUser) {
    await supabase
      .from("users")
      .update({ role: "super_admin", tenant_id: tenantId })
      .eq("id", userId);
  } else {
    const { error: userError } = await supabase.from("users").insert({
      id: userId,
      tenant_id: tenantId,
      email: SUPER_ADMIN.email,
      name: SUPER_ADMIN.name,
      role: "super_admin",
    });

    if (userError) {
      console.error("❌ users レコード作成失敗:", userError.message);
      process.exit(1);
    }
  }

  console.log(`✅ SuperAdmin ユーザー作成完了: ${userId}`);
  console.log("\n========================================");
  console.log("  SuperAdmin ログイン情報");
  console.log("========================================");
  console.log(`  メール:     ${SUPER_ADMIN.email}`);
  console.log(`  パスワード: ${SUPER_ADMIN.password}`);
  console.log(`  テナント:   STEP運営 (${tenantId})`);
  console.log("========================================");
  console.log("\n⚠️  初回ログイン後、パスワードを必ず変更してください。");
}

main().catch((err) => {
  console.error("❌ 予期しないエラー:", err);
  process.exit(1);
});
