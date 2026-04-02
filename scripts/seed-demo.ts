/**
 * デモデータ一括投入スクリプト
 *
 * 実行方法:
 *   npx tsx scripts/seed-demo.ts
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

const TENANT_ID = "a0000000-0000-0000-0000-000000000001";
const DEFAULT_PASSWORD = "Demo2024!";

const DEMO_USERS = [
  { email: "demo-admin@step-app.jp",   name: "山本 太郎",     role: "admin",   phone: "03-1234-5678", bio: "デモ管理者。テナント設定やユーザー管理を担当。" },
  { email: "demo-manager@step-app.jp", name: "佐々木 あおい", role: "manager", bio: "デモマネージャー。チーム日報の承認やフィードバックを担当。", slack_id: "U_DEMO_MGR", calendar_url: "https://calendly.com/demo-manager" },
  { email: "demo-member@step-app.jp",  name: "中村 翔太",     role: "member",  phone: "090-0000-1234", bio: "デモメンバー。営業活動と日報提出を行います。" },
] as const;

async function cleanup() {
  console.log("🧹 クリーンアップ中...");

  // Delete existing demo auth users (cascades handled by checking each table)
  for (const u of DEMO_USERS) {
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", u.email)
      .single();

    if (existing) {
      const uid = existing.id;
      // Delete from dependent tables
      for (const table of [
        "user_levels", "user_badges", "reactions", "nudges",
        "approval_logs", "deals", "weekly_plans", "report_entries",
        "knowledge_posts",
      ]) {
        await supabase.from(table).delete().eq("user_id", uid);
      }
      await supabase.from("goals").delete().eq("owner_id", uid);
      await supabase.from("team_members").delete().eq("user_id", uid);
      // peer_bonuses, report_comments, plan_reviews (may not exist)
      await supabase.from("peer_bonuses").delete().or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`).catch(() => {});
      await supabase.from("report_comments").delete().eq("user_id", uid).catch(() => {});
      await supabase.from("plan_reviews").delete().eq("user_id", uid).catch(() => {});
      // Teams where this user is manager
      await supabase.from("teams").delete().eq("manager_id", uid);
      // Delete user record
      await supabase.from("users").delete().eq("id", uid);
      // Delete auth user
      await supabase.auth.admin.deleteUser(uid);
    }
  }

  // Delete tenant-level data
  await supabase.from("feature_requests").delete().eq("tenant_id", TENANT_ID).catch(() => {});
  await supabase.from("pipeline_stages").delete().eq("tenant_id", TENANT_ID);
  await supabase.from("report_templates").delete().eq("tenant_id", TENANT_ID);
  await supabase.from("tenants").delete().eq("id", TENANT_ID);

  console.log("  ✅ クリーンアップ完了");
}

async function main() {
  await cleanup();

  // ── 1. テナント ──
  console.log("\n📦 テナント作成中...");
  const { error: tenantError } = await supabase
    .from("tenants")
    .insert({ id: TENANT_ID, name: "デモ企業", plan: "professional", report_visibility: "team" });

  if (tenantError) {
    console.error("❌ テナント作成失敗:", tenantError.message);
    process.exit(1);
  }
  console.log("  ✅ デモ企業");

  // ── 2. ユーザー ──
  console.log("\n👤 ユーザー作成中...");
  const createdUsers: { id: string; email: string; role: string; name: string }[] = [];

  for (const u of DEMO_USERS) {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        tenant_id: TENANT_ID,
        name: u.name,
        role: u.role,
      },
    });

    if (authError) {
      console.error(`  ❌ ${u.name}: ${authError.message}`);
      continue;
    }

    const uid = authData.user.id;

    // Update profile fields
    const profileUpdate: Record<string, string | null> = { bio: u.bio };
    if ("phone" in u) profileUpdate.phone = u.phone ?? null;
    if ("slack_id" in u) profileUpdate.slack_id = u.slack_id ?? null;
    if ("calendar_url" in u) profileUpdate.calendar_url = u.calendar_url ?? null;

    await supabase.from("users").update(profileUpdate).eq("id", uid);

    createdUsers.push({ id: uid, email: u.email, role: u.role, name: u.name });
    console.log(`  ✅ ${u.name} (${u.role}) - ${u.email}`);
  }

  if (createdUsers.length < 3) {
    console.error("\n❌ 全ユーザーを作成できませんでした");
    process.exit(1);
  }

  const adminId  = createdUsers.find(u => u.role === "admin")!.id;
  const mgrId    = createdUsers.find(u => u.role === "manager")!.id;
  const memberId = createdUsers.find(u => u.role === "member")!.id;

  // ── 3. チーム ──
  console.log("\n🏢 チーム作成中...");
  const { data: team } = await supabase
    .from("teams")
    .insert({ tenant_id: TENANT_ID, name: "営業チーム", manager_id: mgrId })
    .select("id")
    .single();

  if (team) {
    await supabase.from("team_members").insert([
      { team_id: team.id, user_id: adminId,  role: "admin" },
      { team_id: team.id, user_id: mgrId,    role: "manager" },
      { team_id: team.id, user_id: memberId, role: "member" },
    ]);
    console.log(`  ✅ 営業チーム (${team.id})`);
  }

  // ── 4. テンプレート ──
  console.log("\n📝 テンプレート作成中...");
  const { data: dailyTmpl } = await supabase
    .from("report_templates")
    .insert({
      tenant_id: TENANT_ID, name: "営業日報", type: "daily",
      target_roles: ["member", "manager"], is_system: true, is_published: true,
      schema: {
        sections: [
          { id: "activity", label: "活動実績", fields: [
            { key: "visit_count", type: "number", label: "訪問件数", required: true, unit: "件" },
            { key: "call_count", type: "number", label: "架電件数", required: true, unit: "件" },
          ]},
          { id: "reflection", label: "振り返り", fields: [
            { key: "insights", type: "textarea", label: "所感・気づき", required: true },
            { key: "tomorrow_plan", type: "textarea", label: "明日の予定", required: true },
            { key: "motivation", type: "rating", label: "モチベーション", required: true, min: 1, max: 5 },
          ]},
        ],
      },
    })
    .select("id")
    .single();

  await supabase.from("report_templates").insert({
    tenant_id: TENANT_ID, name: "月曜チェックイン", type: "checkin",
    target_roles: ["member", "manager"], is_system: true, is_published: true,
    schema: {
      sections: [{ id: "checkin", label: "チェックイン", fields: [
        { key: "weekend_rating", type: "rating", label: "週末どうだった？", required: true, min: 1, max: 5 },
        { key: "motivation_comment", type: "textarea", label: "今週の意気込み", required: true },
      ]}],
    },
  });
  console.log("  ✅ 営業日報 + 月曜チェックイン");

  // ── 5. パイプライン ──
  console.log("\n📊 パイプライン作成中...");
  const stages = ["アプローチ", "ヒアリング", "提案", "見積", "交渉", "受注", "失注"];
  const stageInserts = stages.map((name, i) => ({ tenant_id: TENANT_ID, name, sort_order: i + 1 }));
  await supabase.from("pipeline_stages").insert(stageInserts);
  const { data: stageRows } = await supabase
    .from("pipeline_stages")
    .select("id, sort_order")
    .eq("tenant_id", TENANT_ID)
    .order("sort_order");
  const stageIds = (stageRows ?? []).map(s => s.id);
  console.log(`  ✅ ${stages.length} ステージ`);

  // ── 6. 日報 (14日分) ──
  if (dailyTmpl) {
    console.log("\n📄 日報データ作成中...");
    const insights = [
      "新規開拓先のA社から好感触を得た。来週提案書を持参する。",
      "B社の担当者と深い話ができた。ニーズが明確になった。",
      "架電効率を見直し、午前中の方がつながりやすいことが判明。",
      "商談3件完了。C社は見積もりフェーズへ進む見込み。",
    ];
    const plans = [
      "午前: A社訪問、午後: 新規架電10件",
      "提案資料作成、D社フォロー電話",
      "午前: 社内MTG、午後: E社・F社訪問",
    ];
    const reactionTypes = ["like", "fire", "clap"];
    const reactionComments = ["いい動きですね！", "明日も頑張りましょう", "ナイスアクション！"];

    let reportCount = 0;
    for (let d = 13; d >= 0; d--) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const dow = date.getDay();
      if (dow === 0 || dow === 6) continue;
      const dateStr = date.toISOString().split("T")[0];

      // Member report
      const { data: entry } = await supabase.from("report_entries").insert({
        tenant_id: TENANT_ID, user_id: memberId, template_id: dailyTmpl.id,
        report_date: dateStr, status: "submitted", submitted_at: `${dateStr}T17:30:00Z`,
        data: {
          visit_count: Math.floor(Math.random() * 5 + 2),
          call_count: Math.floor(Math.random() * 15 + 5),
          insights: insights[Math.floor(Math.random() * insights.length)],
          tomorrow_plan: plans[Math.floor(Math.random() * plans.length)],
          motivation: Math.floor(Math.random() * 2 + 3),
        },
      }).select("id").single();

      // Manager reaction (50%)
      if (entry && Math.random() > 0.5) {
        await supabase.from("reactions").insert({
          entry_id: entry.id, user_id: mgrId,
          type: reactionTypes[Math.floor(Math.random() * 3)],
          comment: Math.random() > 0.5 ? reactionComments[Math.floor(Math.random() * 3)] : null,
        });
      }

      // Manager report (80%)
      if (Math.random() > 0.2) {
        await supabase.from("report_entries").insert({
          tenant_id: TENANT_ID, user_id: mgrId, template_id: dailyTmpl.id,
          report_date: dateStr, status: "submitted", submitted_at: `${dateStr}T18:00:00Z`,
          data: {
            visit_count: Math.floor(Math.random() * 3 + 1),
            call_count: Math.floor(Math.random() * 8 + 3),
            insights: "チームの架電数が先週比20%増加。勢いが出てきた。",
            tomorrow_plan: "1on1 × 2、戦略会議、数値レビュー",
            motivation: Math.floor(Math.random() * 2 + 3),
          },
        });
      }
      reportCount++;
    }
    console.log(`  ✅ ${reportCount}日分の日報`);

    // ── 7. 案件 ──
    if (stageIds.length >= 6) {
      console.log("\n💼 案件データ作成中...");
      const today = new Date().toISOString().split("T")[0];
      const in7 = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
      const in14 = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
      const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
      const ago7 = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

      await supabase.from("deals").insert([
        { tenant_id: TENANT_ID, user_id: memberId, stage_id: stageIds[2], company: "株式会社テクノス",     title: "ITコンサル導入",  value: 5000000, due_date: in14, status: "active" },
        { tenant_id: TENANT_ID, user_id: memberId, stage_id: stageIds[3], company: "ABC商事",            title: "SaaSリプレイス",  value: 3200000, due_date: in7,  status: "active" },
        { tenant_id: TENANT_ID, user_id: memberId, stage_id: stageIds[0], company: "グリーン工業",        title: "新規アプローチ",   due_date: in30, status: "active" },
        { tenant_id: TENANT_ID, user_id: mgrId,    stage_id: stageIds[4], company: "フューチャーデザイン", title: "DX推進支援",     value: 8000000, due_date: today, status: "active" },
        { tenant_id: TENANT_ID, user_id: memberId, stage_id: stageIds[5], company: "スカイネット",        title: "セキュリティ監査", value: 1500000, due_date: ago7,  status: "won" },
      ]);
      console.log("  ✅ 5件の案件");
    }

    // ── 8. 週次計画 ──
    console.log("\n📋 週次計画作成中...");
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(weekStart.getDate() - 7);

    const { data: plan } = await supabase.from("weekly_plans").insert({
      tenant_id: TENANT_ID, user_id: memberId,
      week_start: lastWeekStart.toISOString().split("T")[0],
      template_id: dailyTmpl.id,
      items: { focus: "新規開拓 + 既存フォロー", targets: [{ task: "A社提案書作成", done: true }, { task: "新規架電50件", done: true }, { task: "B社見積提出", done: false }] },
      status: "approved", approved_by: mgrId, execution_rate: 66.7,
    }).select("id").single();

    await supabase.from("weekly_plans").insert({
      tenant_id: TENANT_ID, user_id: memberId,
      week_start: weekStart.toISOString().split("T")[0],
      template_id: dailyTmpl.id,
      items: { focus: "B社見積完了 + テクノス社クロージング", targets: [{ task: "B社見積提出", done: false }, { task: "テクノス社最終提案", done: false }] },
      status: "submitted",
    });
    console.log("  ✅ 2週分");
  }

  // ── 9. ナレッジ ──
  console.log("\n📚 ナレッジ作成中...");
  await supabase.from("knowledge_posts").insert([
    { tenant_id: TENANT_ID, user_id: memberId, title: "新規架電で有効だったトークスクリプト", body: "先週試した新しいトークスクリプトが好反応でした。\n\n1. 最初に相手の課題を仮説で提示する\n2. 具体的な数字を早めに出す\n\nアポ獲得率が 8% → 15% に改善。", tags: ["営業", "架電"] },
    { tenant_id: TENANT_ID, user_id: mgrId,    title: "1on1で使える質問テンプレート", body: "メンバーとの1on1で効果的だった質問:\n\n- 今週一番時間を使ったことは？\n- 3ヶ月後にできるようになりたいことは？\n\n沈黙を恐れないことが大事。", tags: ["マネジメント", "1on1"] },
  ]);
  console.log("  ✅ 2件");

  // ── 10. バッジ・レベル ──
  console.log("\n🏅 バッジ・レベル設定中...");
  await supabase.from("badges").upsert([
    { name: "ファーストステップ", description: "初めて日報を提出しました", icon: "🚀", condition: { type: "first_report" }, rarity: "common" },
    { name: "7日連続", description: "7日連続で日報を提出", icon: "🔥", condition: { type: "streak", days: 7 }, rarity: "common" },
  ], { onConflict: "name" }).catch(() => {
    // badges might not have unique on name, insert instead
    supabase.from("badges").insert([
      { name: "ファーストステップ", description: "初めて日報を提出しました", icon: "🚀", condition: { type: "first_report" }, rarity: "common" },
      { name: "7日連続", description: "7日連続で日報を提出", icon: "🔥", condition: { type: "streak", days: 7 }, rarity: "common" },
    ]);
  });

  const { data: badges } = await supabase.from("badges").select("id, name");
  const firstBadge = badges?.find(b => b.name === "ファーストステップ");
  const streakBadge = badges?.find(b => b.name === "7日連続");

  if (firstBadge) {
    await supabase.from("user_badges").insert([
      { user_id: memberId, badge_id: firstBadge.id },
      { user_id: mgrId,    badge_id: firstBadge.id },
    ]).catch(() => {});
  }
  if (streakBadge) {
    await supabase.from("user_badges").insert({ user_id: memberId, badge_id: streakBadge.id }).catch(() => {});
  }

  await supabase.from("user_levels").upsert([
    { user_id: adminId,  level: 1, xp: 0 },
    { user_id: mgrId,    level: 2, xp: 180 },
    { user_id: memberId, level: 2, xp: 220 },
  ], { onConflict: "user_id" });
  console.log("  ✅ バッジ + レベル");

  // ── 11. 目標 ──
  console.log("\n🎯 目標作成中...");
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  await supabase.from("goals").insert([
    { tenant_id: TENANT_ID, level: "team", name: "月間売上 2,000万円", target_value: 20000000, period_start: monthStart, period_end: monthEnd, owner_id: mgrId, team_id: team?.id },
    { tenant_id: TENANT_ID, level: "individual", name: "月間訪問 40件", target_value: 40, kpi_field_key: "visit_count", template_id: dailyTmpl?.id, period_start: monthStart, period_end: monthEnd, owner_id: memberId },
  ]);
  console.log("  ✅ 2件");

  // ── 完了 ──
  console.log("\n" + "=".repeat(50));
  console.log("🎉 デモデータ投入完了！");
  console.log("=".repeat(50));
  console.log(`\nパスワード (共通): ${DEFAULT_PASSWORD}`);
  console.log("\nログイン情報:");
  console.log("─".repeat(50));
  for (const u of createdUsers) {
    const roleLabel = u.role === "admin" ? "管理者    " : u.role === "manager" ? "マネージャー" : "メンバー  ";
    console.log(`  ${roleLabel}  ${u.name}  ${u.email}`);
  }
  console.log("─".repeat(50));
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
