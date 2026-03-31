/**
 * 株式会社プロタゴニスト シードデータ投入スクリプト
 *
 * 実行方法:
 *   npx tsx scripts/seed-protagonist.ts
 *
 * 事前条件:
 *   - .env.local にSupabase接続情報が設定されていること
 *   - マイグレーション (00001〜00007) が実行済みであること
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
  name: "株式会社プロタゴニスト",
  plan: "professional" as const,
  report_visibility: "team" as const,
};

const DEFAULT_PASSWORD = "Step2024!";

const EMPLOYEES = [
  {
    employee_id: "PTG001",
    name: "鶴田 悠貴",
    email: "tsuruta@protagonist-inc.jp",
    role: "admin",
    joined_at: "2016-04-01",
    department: "IT",
  },
  {
    employee_id: "PTG002",
    name: "田内 将貴",
    email: "tauchi@protagonist-inc.jp",
    role: "manager",
    joined_at: "2019-10-01",
    department: "IT",
  },
  {
    employee_id: "PTG003",
    name: "土岐 裕哉",
    email: "toki@protagonist-inc.jp",
    role: "member",
    joined_at: "2020-04-01",
    department: "IT",
  },
  {
    employee_id: "PTG004",
    name: "渥美 友将",
    email: "atsumi@protagonist-inc.jp",
    role: "manager",
    joined_at: "2017-04-01",
    department: "IT",
  },
  {
    employee_id: "PTG005",
    name: "越田 太陽",
    email: "koshida@protagonist-inc.jp",
    role: "member",
    joined_at: "2024-04-01",
    department: "IT",
  },
];

async function main() {
  console.log("🚀 シードデータ投入を開始します...\n");

  // ── 1. テナント作成 ──
  console.log("📦 テナント作成中...");
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
  console.log(`✅ テナント作成完了: ${tenant.id}\n`);

  // ── 2. ユーザー作成 (auth + public.users) ──
  console.log("👤 ユーザー作成中...");
  const createdUsers: { id: string; name: string; role: string }[] = [];

  for (const emp of EMPLOYEES) {
    // auth.users に作成
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: emp.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: {
          tenant_id: tenant.id,
          name: emp.name,
          role: emp.role,
        },
      });

    if (authError) {
      console.error(`❌ ${emp.name} (auth) 作成失敗:`, authError.message);
      continue;
    }

    const userId = authData.user.id;

    // public.users を更新 (トリガーで作成済みのはずだが、追加フィールドを設定)
    const { error: updateError } = await supabase
      .from("users")
      .update({
        bio: `社員番号: ${emp.employee_id} / 入社日: ${emp.joined_at} / 部門: ${emp.department}`,
        settings: {
          employee_id: emp.employee_id,
          joined_at: emp.joined_at,
          department: emp.department,
        },
      })
      .eq("id", userId);

    if (updateError) {
      console.error(`⚠️ ${emp.name} (profile) 更新失敗:`, updateError.message);
    }

    createdUsers.push({ id: userId, name: emp.name, role: emp.role });
    console.log(`  ✅ ${emp.name} (${emp.role}) - ${emp.email}`);
  }

  console.log("");

  // ── 3. チーム作成 ──
  console.log("🏢 チーム作成中...");
  const manager1 = createdUsers.find((u) => u.name === "田内 将貴");
  const _manager2 = createdUsers.find((u) => u.name === "渥美 友将");

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      tenant_id: tenant.id,
      name: "IT事業部",
      manager_id: manager1?.id || null,
    })
    .select("id")
    .single();

  if (teamError) {
    console.error("❌ チーム作成失敗:", teamError.message);
  } else {
    console.log(`  ✅ IT事業部 (ID: ${team.id})`);

    // 全員をチームに追加
    const members = createdUsers.map((u) => ({
      team_id: team.id,
      user_id: u.id,
      role: u.role === "admin" ? "admin" : u.role === "manager" ? "manager" : "member",
    }));

    const { error: membersError } = await supabase
      .from("team_members")
      .insert(members);

    if (membersError) {
      console.error("❌ メンバー追加失敗:", membersError.message);
    } else {
      console.log(`  ✅ メンバー ${members.length}名 を追加`);
    }
  }

  console.log("");

  // ── 4. プリセットテンプレート作成 ──
  console.log("📝 テンプレート作成中...");
  const templates = [
    {
      name: "RAコンサルタント日報",
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
              { key: "new_approach_count", type: "number", label: "新規アプローチ件数", required: true, unit: "件" },
              { key: "meeting_records", type: "repeater", label: "商談記録", required: false, fields: [
                { key: "company_name", type: "text", label: "企業名", required: true },
                { key: "status", type: "select_single", label: "ステータス", required: true, options: ["初回接触","ヒアリング済","提案中","条件交渉","成約","失注"] },
                { key: "memo", type: "textarea", label: "メモ", required: false },
              ]},
              { key: "hearing_count", type: "number", label: "求人ヒアリング件数", required: true, unit: "件" },
              { key: "recommendation_count", type: "number", label: "推薦数", required: true, unit: "件" },
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
              { key: "weekend_comment", type: "textarea", label: "週末のコメント", required: false },
              { key: "recommendation", type: "textarea", label: "チームにおすすめしたいこと", required: false },
              { key: "motivation_comment", type: "textarea", label: "今週の意気込み", required: true },
            ],
          },
        ],
      },
    },
    {
      name: "週次行動計画",
      type: "plan",
      target_roles: ["member", "manager"],
      is_system: true,
      is_published: true,
      schema: {
        sections: [
          {
            id: "plan",
            label: "今週の計画",
            fields: [
              { key: "focus_items", type: "textarea", label: "今週の重点項目", required: true },
              { key: "approach_list", type: "repeater", label: "アプローチ予定リスト", required: false, fields: [
                { key: "company", type: "text", label: "企業名", required: true },
                { key: "action", type: "text", label: "アクション", required: true },
                { key: "due_date", type: "date", label: "期日", required: false },
              ]},
              { key: "follow_list", type: "repeater", label: "フォロー案件リスト", required: false, fields: [
                { key: "deal_name", type: "text", label: "案件名", required: true },
                { key: "next_action", type: "text", label: "ネクストアクション", required: true },
                { key: "due_date", type: "date", label: "期日", required: false },
              ]},
            ],
          },
        ],
      },
    },
  ];

  for (const tmpl of templates) {
    const { error } = await supabase.from("report_templates").insert({
      tenant_id: tenant.id,
      ...tmpl,
    });
    if (error) {
      console.error(`  ❌ ${tmpl.name} 作成失敗:`, error.message);
    } else {
      console.log(`  ✅ ${tmpl.name}`);
    }
  }

  console.log("");

  // ── 5. パイプライン作成 ──
  console.log("📊 パイプライン作成中...");
  const stages = [
    "アプローチ", "ヒアリング", "求人受注", "推薦",
    "書類通過", "面接", "内定", "入社",
  ];

  for (let i = 0; i < stages.length; i++) {
    const { error } = await supabase.from("pipeline_stages").insert({
      tenant_id: tenant.id,
      name: stages[i],
      sort_order: i + 1,
    });
    if (error) {
      console.error(`  ❌ ${stages[i]} 作成失敗:`, error.message);
    }
  }
  console.log(`  ✅ パイプライン ${stages.length} ステージ作成完了`);

  // ── 6. バッジ作成 ──
  console.log("🏅 バッジ作成中...");
  const badges = [
    { name: "ファーストステップ", description: "初回日報提出", icon: "🎯", condition: { type: "first_report" }, rarity: "common" },
    { name: "7日連続", description: "7日連続で日報提出", icon: "🔥", condition: { type: "streak", days: 7 }, rarity: "common" },
    { name: "30日連続", description: "30日連続で日報提出", icon: "🔥", condition: { type: "streak", days: 30 }, rarity: "rare" },
    { name: "100日連続", description: "100日連続で日報提出", icon: "🔥", condition: { type: "streak", days: 100 }, rarity: "epic" },
    { name: "月間目標達成", description: "月間目標を達成", icon: "🏆", condition: { type: "monthly_goal" }, rarity: "rare" },
    { name: "ナレッジ初投稿", description: "初めてナレッジを投稿", icon: "💡", condition: { type: "first_knowledge" }, rarity: "common" },
    { name: "リアクション50回", description: "リアクションを50回送信", icon: "👏", condition: { type: "reaction_count", count: 50 }, rarity: "rare" },
    { name: "全員からリアクション", description: "チーム全員からリアクションを獲得", icon: "⭐", condition: { type: "all_reactions" }, rarity: "epic" },
    { name: "四半期MVP", description: "四半期MVPに選出", icon: "🌟", condition: { type: "quarterly_mvp" }, rarity: "legendary" },
  ];

  const { error: badgeError } = await supabase.from("badges").insert(badges);
  if (badgeError) {
    console.error("  ❌ バッジ作成失敗:", badgeError.message);
  } else {
    console.log(`  ✅ バッジ ${badges.length}個 作成完了`);
  }

  // ── 7. user_levels 初期化 ──
  console.log("📈 レベル初期化中...");
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
  console.log("🎉 シードデータ投入完了！");
  console.log("=".repeat(50));
  console.log(`\nテナント: ${TENANT.name}`);
  console.log(`ユーザー数: ${createdUsers.length}名`);
  console.log(`初期パスワード: ${DEFAULT_PASSWORD}`);
  console.log("\nログイン情報:");
  for (const emp of EMPLOYEES) {
    console.log(`  ${emp.name} (${emp.role}): ${emp.email}`);
  }
  console.log("\n⚠️  初回ログイン後にパスワードを変更してください。");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
