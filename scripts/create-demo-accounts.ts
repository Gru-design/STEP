/**
 * デモアカウント作成スクリプト
 *
 * admin / manager / member の3アカウントを1テナントに作成します。
 *
 * 実行方法:
 *   npx tsx scripts/create-demo-accounts.ts
 *
 * 事前条件:
 *   - .env.local に NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY が設定されていること
 *   - マイグレーションが実行済みであること
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ .env.local の SUPABASE_URL / SERVICE_ROLE_KEY が未設定です");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TENANT = {
  name: "デモ企業",
  plan: "professional" as const,
  report_visibility: "team" as const,
};

const DEFAULT_PASSWORD = "Demo2024!";

const DEMO_USERS = [
  {
    name: "山本 太郎",
    email: "demo-admin@step-app.jp",
    role: "admin",
    bio: "デモ用管理者アカウント",
    phone: "03-1234-5678",
  },
  {
    name: "佐々木 あおい",
    email: "demo-manager@step-app.jp",
    role: "manager",
    bio: "デモ用マネージャーアカウント",
    slack_id: "U_DEMO_MGR",
    calendar_url: "https://calendly.com/demo-manager",
  },
  {
    name: "中村 翔太",
    email: "demo-member@step-app.jp",
    role: "member",
    bio: "デモ用メンバーアカウント",
    phone: "090-0000-1234",
  },
];

async function main() {
  console.log("🚀 デモアカウントを作成します...\n");

  // ── 1. テナント作成 ──
  const { data: existingTenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("name", TENANT.name)
    .single();

  let tenantId: string;

  if (existingTenant) {
    tenantId = existingTenant.id;
    console.log(`✅ 既存テナントを使用: ${TENANT.name} (${tenantId})`);
  } else {
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        name: TENANT.name,
        plan: TENANT.plan,
        report_visibility: TENANT.report_visibility,
      })
      .select("id")
      .single();

    if (tenantError) {
      console.error("❌ テナント作成失敗:", tenantError.message);
      process.exit(1);
    }
    tenantId = tenant.id;
    console.log(`✅ テナント作成: ${TENANT.name} (${tenantId})`);
  }

  // ── 2. ユーザー作成 ──
  console.log("\n👤 ユーザー作成中...");
  const createdUsers: { id: string; name: string; role: string; email: string }[] = [];

  for (const u of DEMO_USERS) {
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: u.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: {
          tenant_id: tenantId,
          name: u.name,
          role: u.role,
        },
      });

    if (authError) {
      console.error(`  ❌ ${u.name} (auth) 作成失敗:`, authError.message);
      continue;
    }

    const userId = authData.user.id;

    // public.users の追加フィールドを更新
    const updateData: Record<string, string | null> = {
      bio: u.bio,
    };
    if ("phone" in u) updateData.phone = u.phone ?? null;
    if ("slack_id" in u) updateData.slack_id = u.slack_id ?? null;
    if ("calendar_url" in u) updateData.calendar_url = u.calendar_url ?? null;

    const { error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", userId);

    if (updateError) {
      console.error(`  ⚠️  ${u.name} プロフィール更新失敗:`, updateError.message);
    }

    createdUsers.push({ id: userId, name: u.name, role: u.role, email: u.email });
    console.log(`  ✅ ${u.name} (${u.role}) - ${u.email}`);
  }

  if (createdUsers.length === 0) {
    console.error("\n❌ ユーザーが1人も作成できませんでした。");
    process.exit(1);
  }

  // ── 3. チーム作成 ──
  console.log("\n🏢 チーム作成中...");
  const manager = createdUsers.find((u) => u.role === "manager");
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      tenant_id: tenantId,
      name: "営業チーム",
      manager_id: manager?.id || null,
    })
    .select("id")
    .single();

  if (teamError) {
    console.error("  ❌ チーム作成失敗:", teamError.message);
  } else {
    console.log(`  ✅ 営業チーム (${team.id})`);

    const members = createdUsers.map((u) => ({
      team_id: team.id,
      user_id: u.id,
      role: u.role === "admin" ? "admin" : u.role === "manager" ? "manager" : "member",
    }));

    const { error: membersError } = await supabase
      .from("team_members")
      .insert(members);

    if (membersError) {
      console.error("  ❌ メンバー追加失敗:", membersError.message);
    } else {
      console.log(`  ✅ メンバー ${members.length}名 を追加`);
    }
  }

  // ── 4. テンプレート作成 ──
  console.log("\n📝 テンプレート作成中...");
  const templates = [
    {
      name: "営業日報",
      type: "daily",
      target_roles: ["member", "manager"],
      is_system: true,
      is_published: true,
      schema: {
        sections: [
          {
            id: "activity",
            label: "活動実績",
            fields: [
              { key: "visit_count", type: "number", label: "訪問件数", required: true, unit: "件" },
              { key: "call_count", type: "number", label: "架電件数", required: true, unit: "件" },
              { key: "meeting_records", type: "repeater", label: "商談記録", required: false, fields: [
                { key: "company_name", type: "text", label: "企業名", required: true },
                { key: "status", type: "select_single", label: "ステータス", required: true, options: ["初回接触","提案中","見積中","受注","失注"] },
                { key: "memo", type: "textarea", label: "メモ", required: false },
              ]},
            ],
          },
          {
            id: "reflection",
            label: "振り返り",
            fields: [
              { key: "insights", type: "textarea", label: "所感・気づき", required: true, placeholder: "今日の気づきや学びを記入してください" },
              { key: "tomorrow_plan", type: "textarea", label: "明日の予定", required: true },
              { key: "motivation", type: "rating", label: "モチベーション", required: true, min: 1, max: 5 },
            ],
          },
        ],
      },
    },
    {
      name: "月曜チェックイン",
      type: "checkin",
      target_roles: ["member", "manager"],
      is_system: true,
      is_published: true,
      schema: {
        sections: [
          {
            id: "checkin",
            label: "チェックイン",
            fields: [
              { key: "weekend_rating", type: "rating", label: "週末どうだった？", required: true, min: 1, max: 5 },
              { key: "motivation_comment", type: "textarea", label: "今週の意気込み", required: true },
            ],
          },
        ],
      },
    },
  ];

  for (const tmpl of templates) {
    const { error } = await supabase.from("report_templates").insert({
      tenant_id: tenantId,
      ...tmpl,
    });
    if (error) {
      console.error(`  ❌ ${tmpl.name} 作成失敗:`, error.message);
    } else {
      console.log(`  ✅ ${tmpl.name}`);
    }
  }

  // ── 5. パイプライン作成 ──
  console.log("\n📊 パイプライン作成中...");
  const stages = ["アプローチ", "ヒアリング", "提案", "見積", "交渉", "受注", "失注"];
  for (let i = 0; i < stages.length; i++) {
    const { error } = await supabase.from("pipeline_stages").insert({
      tenant_id: tenantId,
      name: stages[i],
      sort_order: i + 1,
    });
    if (error) {
      console.error(`  ❌ ${stages[i]} 作成失敗:`, error.message);
    }
  }
  console.log(`  ✅ パイプライン ${stages.length} ステージ作成`);

  // ── 6. レベル初期化 ──
  console.log("\n📈 レベル初期化中...");
  for (const u of createdUsers) {
    const { error } = await supabase.from("user_levels").insert({
      user_id: u.id,
      level: 1,
      xp: 0,
    });
    if (error) {
      console.error(`  ❌ ${u.name} レベル初期化失敗:`, error.message);
    }
  }
  console.log(`  ✅ ${createdUsers.length}名 のレベルを初期化`);

  // ── 完了 ──
  console.log("\n" + "=".repeat(50));
  console.log("🎉 デモアカウント作成完了！");
  console.log("=".repeat(50));
  console.log(`\nテナント: ${TENANT.name}`);
  console.log(`パスワード (共通): ${DEFAULT_PASSWORD}`);
  console.log("\nログイン情報:");
  console.log("─".repeat(50));
  for (const u of createdUsers) {
    const roleLabel = u.role === "admin" ? "管理者" : u.role === "manager" ? "マネージャー" : "メンバー";
    console.log(`  ${roleLabel.padEnd(8)} ${u.name}  ${u.email}`);
  }
  console.log("─".repeat(50));
  console.log("\n⚠️  デモ後はパスワードを変更するか、アカウントを削除してください。");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
