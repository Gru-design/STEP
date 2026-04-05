import type { SupabaseClient } from "@supabase/supabase-js";
import type { TemplateSchema } from "@/types/database";
import type { IndustryType } from "@/app/(dashboard)/onboarding/actions";

interface PresetTemplate {
  name: string;
  type: "daily" | "weekly" | "plan" | "checkin";
  target_roles: string[];
  schema: TemplateSchema;
}

// ─── 人材紹介 (Recruitment Agency) ───────────────────────────────

const RECRUITMENT_PRESETS: PresetTemplate[] = [
  {
    name: "RAコンサルタント日報",
    type: "daily",
    target_roles: ["member", "manager"],
    schema: {
      sections: [
        {
          id: "kpi",
          label: "本日の活動実績",
          fields: [
            { key: "new_approach", type: "number", label: "新規アプローチ数", required: true, unit: "件", min: 0, show_cumulative: true },
            { key: "meeting_count", type: "number", label: "面談実施数", required: true, unit: "件", min: 0, show_cumulative: true },
            { key: "recommendation_count", type: "number", label: "推薦数", required: true, unit: "件", min: 0, show_cumulative: true },
            { key: "interview_setup", type: "number", label: "面接設定数", required: true, unit: "件", min: 0, show_cumulative: true },
            { key: "offer_count", type: "number", label: "内定数", required: false, unit: "件", min: 0, show_cumulative: true },
          ],
        },
        {
          id: "details",
          label: "活動詳細",
          fields: [
            { key: "activities", type: "repeater", label: "対応案件", required: false, fields: [
              { key: "company", type: "text", label: "企業名", required: true, placeholder: "株式会社〇〇" },
              { key: "candidate", type: "text", label: "候補者名", required: false, placeholder: "候補者イニシャル" },
              { key: "action", type: "select_single", label: "対応内容", required: true, options: ["スカウト", "面談", "推薦", "面接調整", "条件交渉", "フォロー"] },
              { key: "note", type: "text", label: "メモ", required: false },
            ]},
          ],
        },
        {
          id: "reflection",
          label: "振り返り",
          fields: [
            { key: "achievement", type: "textarea", label: "本日の成果・気づき", required: true, placeholder: "うまくいったこと、学んだことを記入" },
            { key: "tomorrow_plan", type: "textarea", label: "明日の予定", required: true, placeholder: "明日の重点タスクを記入" },
            { key: "motivation", type: "rating", label: "モチベーション", required: true, min: 1, max: 5 },
          ],
        },
      ],
    },
  },
  {
    name: "CAキャリアアドバイザー日報",
    type: "daily",
    target_roles: ["member", "manager"],
    schema: {
      sections: [
        {
          id: "kpi",
          label: "本日の活動実績",
          fields: [
            { key: "new_registration", type: "number", label: "新規登録面談数", required: true, unit: "件", min: 0, show_cumulative: true },
            { key: "career_interview", type: "number", label: "キャリア面談数", required: true, unit: "件", min: 0, show_cumulative: true },
            { key: "resume_review", type: "number", label: "書類添削数", required: true, unit: "件", min: 0, show_cumulative: true },
            { key: "interview_prep", type: "number", label: "面接対策数", required: true, unit: "件", min: 0, show_cumulative: true },
            { key: "placement", type: "number", label: "入社決定数", required: false, unit: "件", min: 0, show_cumulative: true },
          ],
        },
        {
          id: "reflection",
          label: "振り返り",
          fields: [
            { key: "achievement", type: "textarea", label: "本日の成果・気づき", required: true, placeholder: "求職者対応で気づいたこと" },
            { key: "concern", type: "textarea", label: "懸念事項・相談", required: false, placeholder: "フォローが必要な求職者など" },
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
    schema: {
      sections: [
        {
          id: "checkin",
          label: "今週のコンディション",
          fields: [
            { key: "condition", type: "rating", label: "今の調子", required: true, min: 1, max: 5 },
            { key: "weekend_comment", type: "textarea", label: "週末どうでしたか？", required: false, placeholder: "リフレッシュできた？気になることある？" },
            { key: "week_focus", type: "textarea", label: "今週注力したいこと", required: true, placeholder: "今週の重点テーマ" },
            { key: "support_needed", type: "textarea", label: "サポートが必要なこと", required: false, placeholder: "マネージャーに相談したいこと" },
          ],
        },
      ],
    },
  },
  {
    name: "週次行動計画",
    type: "plan",
    target_roles: ["member", "manager"],
    schema: {
      sections: [
        {
          id: "targets",
          label: "今週の目標",
          fields: [
            { key: "approach_target", type: "number", label: "アプローチ目標", required: true, unit: "件", min: 0 },
            { key: "meeting_target", type: "number", label: "面談目標", required: true, unit: "件", min: 0 },
            { key: "recommendation_target", type: "number", label: "推薦目標", required: true, unit: "件", min: 0 },
          ],
        },
        {
          id: "plan",
          label: "アクションプラン",
          fields: [
            { key: "focus_items", type: "textarea", label: "重点施策", required: true, placeholder: "今週の重点的な取り組み" },
            { key: "follow_up", type: "repeater", label: "フォローアップ案件", required: false, fields: [
              { key: "company", type: "text", label: "企業/候補者", required: true },
              { key: "action", type: "text", label: "アクション", required: true },
              { key: "due", type: "date", label: "期限", required: false },
            ]},
          ],
        },
      ],
    },
  },
];

// ─── 人材派遣 (Staffing Agency) ──────────────────────────────────

const STAFFING_AGENCY_PRESETS: PresetTemplate[] = [
  {
    name: "営業日報",
    type: "daily",
    target_roles: ["member", "manager"],
    schema: {
      sections: [
        {
          id: "kpi",
          label: "本日の活動実績",
          fields: [
            { key: "new_client_visit", type: "number", label: "新規企業訪問数", required: true, unit: "件", min: 0, show_cumulative: true },
            { key: "existing_client_visit", type: "number", label: "既存企業訪問数", required: true, unit: "件", min: 0, show_cumulative: true },
            { key: "order_received", type: "number", label: "受注オーダー数", required: true, unit: "件", min: 0, show_cumulative: true },
            { key: "staff_proposal", type: "number", label: "スタッフ提案数", required: true, unit: "件", min: 0, show_cumulative: true },
            { key: "placement_count", type: "number", label: "入職決定数", required: false, unit: "件", min: 0, show_cumulative: true },
          ],
        },
        {
          id: "details",
          label: "訪問詳細",
          fields: [
            { key: "visits", type: "repeater", label: "訪問記録", required: false, fields: [
              { key: "company", type: "text", label: "企業名", required: true },
              { key: "purpose", type: "select_single", label: "目的", required: true, options: ["新規開拓", "オーダー確認", "スタッフフォロー", "契約更新", "クレーム対応"] },
              { key: "result", type: "text", label: "結果・次アクション", required: true },
            ]},
          ],
        },
        {
          id: "reflection",
          label: "振り返り",
          fields: [
            { key: "achievement", type: "textarea", label: "成果・気づき", required: true },
            { key: "tomorrow_plan", type: "textarea", label: "明日の予定", required: true },
            { key: "motivation", type: "rating", label: "モチベーション", required: true, min: 1, max: 5 },
          ],
        },
      ],
    },
  },
  {
    name: "コーディネーター日報",
    type: "daily",
    target_roles: ["member", "manager"],
    schema: {
      sections: [
        {
          id: "kpi",
          label: "本日の活動実績",
          fields: [
            { key: "new_registration", type: "number", label: "新規登録数", required: true, unit: "件", min: 0, show_cumulative: true },
            { key: "interview_count", type: "number", label: "面談実施数", required: true, unit: "件", min: 0, show_cumulative: true },
            { key: "job_matching", type: "number", label: "仕事紹介数", required: true, unit: "件", min: 0, show_cumulative: true },
            { key: "entry_count", type: "number", label: "エントリー数", required: true, unit: "件", min: 0, show_cumulative: true },
            { key: "start_count", type: "number", label: "就業開始数", required: false, unit: "件", min: 0, show_cumulative: true },
          ],
        },
        {
          id: "staff_issues",
          label: "スタッフ対応",
          fields: [
            { key: "staff_followup", type: "textarea", label: "フォローが必要なスタッフ", required: false, placeholder: "就業中スタッフの状況、早期退職リスクなど" },
            { key: "trouble", type: "textarea", label: "トラブル・クレーム", required: false, placeholder: "発生した問題と対応状況" },
          ],
        },
        {
          id: "reflection",
          label: "振り返り",
          fields: [
            { key: "achievement", type: "textarea", label: "成果・気づき", required: true },
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
    schema: {
      sections: [
        {
          id: "checkin",
          label: "今週のコンディション",
          fields: [
            { key: "condition", type: "rating", label: "今の調子", required: true, min: 1, max: 5 },
            { key: "weekend_comment", type: "textarea", label: "週末どうでしたか？", required: false },
            { key: "week_focus", type: "textarea", label: "今週注力したいこと", required: true },
            { key: "support_needed", type: "textarea", label: "サポートが必要なこと", required: false },
          ],
        },
      ],
    },
  },
  {
    name: "週次行動計画",
    type: "plan",
    target_roles: ["member", "manager"],
    schema: {
      sections: [
        {
          id: "targets",
          label: "今週の目標",
          fields: [
            { key: "visit_target", type: "number", label: "訪問目標", required: true, unit: "件", min: 0 },
            { key: "order_target", type: "number", label: "受注目標", required: true, unit: "件", min: 0 },
            { key: "placement_target", type: "number", label: "入職目標", required: true, unit: "件", min: 0 },
          ],
        },
        {
          id: "plan",
          label: "アクションプラン",
          fields: [
            { key: "focus_items", type: "textarea", label: "重点施策", required: true, placeholder: "注力する企業・案件" },
            { key: "staff_follow", type: "textarea", label: "スタッフフォロー計画", required: false, placeholder: "契約更新面談、問題スタッフ対応など" },
          ],
        },
      ],
    },
  },
];

// ─── メディア (Media / Job Board) ────────────────────────────────

const MEDIA_PRESETS: PresetTemplate[] = [
  {
    name: "営業日報",
    type: "daily",
    target_roles: ["member", "manager"],
    schema: {
      sections: [
        {
          id: "kpi",
          label: "本日の活動実績",
          fields: [
            { key: "tel_count", type: "number", label: "架電数", required: true, unit: "件", min: 0, show_cumulative: true },
            { key: "connect_count", type: "number", label: "接続数", required: true, unit: "件", min: 0, show_cumulative: true },
            { key: "appointment_count", type: "number", label: "アポ獲得数", required: true, unit: "件", min: 0, show_cumulative: true },
            { key: "proposal_count", type: "number", label: "提案数", required: true, unit: "件", min: 0, show_cumulative: true },
            { key: "contract_count", type: "number", label: "受注数", required: false, unit: "件", min: 0, show_cumulative: true },
            { key: "revenue", type: "number", label: "受注金額", required: false, unit: "万円", min: 0, show_cumulative: true },
          ],
        },
        {
          id: "details",
          label: "商談詳細",
          fields: [
            { key: "meetings", type: "repeater", label: "商談記録", required: false, fields: [
              { key: "company", type: "text", label: "企業名", required: true },
              { key: "product", type: "select_single", label: "商材", required: true, options: ["求人広告", "スカウトDB", "イベント", "その他"] },
              { key: "stage", type: "select_single", label: "進捗", required: true, options: ["初回接触", "ヒアリング", "提案済み", "見積提出", "受注", "失注"] },
              { key: "note", type: "text", label: "メモ", required: false },
            ]},
          ],
        },
        {
          id: "reflection",
          label: "振り返り",
          fields: [
            { key: "achievement", type: "textarea", label: "成果・気づき", required: true },
            { key: "tomorrow_plan", type: "textarea", label: "明日の予定", required: true },
            { key: "motivation", type: "rating", label: "モチベーション", required: true, min: 1, max: 5 },
          ],
        },
      ],
    },
  },
  {
    name: "メディア運用日報",
    type: "daily",
    target_roles: ["member", "manager"],
    schema: {
      sections: [
        {
          id: "kpi",
          label: "本日の実績",
          fields: [
            { key: "article_count", type: "number", label: "記事作成数", required: true, unit: "件", min: 0, show_cumulative: true },
            { key: "edit_count", type: "number", label: "記事編集・更新数", required: true, unit: "件", min: 0, show_cumulative: true },
            { key: "pv", type: "number", label: "PV数", required: false, unit: "PV", min: 0 },
            { key: "application_count", type: "number", label: "応募数", required: false, unit: "件", min: 0, show_cumulative: true },
          ],
        },
        {
          id: "operations",
          label: "運用タスク",
          fields: [
            { key: "tasks_done", type: "textarea", label: "完了したタスク", required: true, placeholder: "本日完了した作業を記入" },
            { key: "issues", type: "textarea", label: "課題・ブロッカー", required: false, placeholder: "進行を妨げている問題" },
          ],
        },
        {
          id: "reflection",
          label: "振り返り",
          fields: [
            { key: "achievement", type: "textarea", label: "成果・気づき", required: true },
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
    schema: {
      sections: [
        {
          id: "checkin",
          label: "今週のコンディション",
          fields: [
            { key: "condition", type: "rating", label: "今の調子", required: true, min: 1, max: 5 },
            { key: "weekend_comment", type: "textarea", label: "週末どうでしたか？", required: false },
            { key: "week_focus", type: "textarea", label: "今週注力したいこと", required: true },
            { key: "support_needed", type: "textarea", label: "サポートが必要なこと", required: false },
          ],
        },
      ],
    },
  },
  {
    name: "週次行動計画",
    type: "plan",
    target_roles: ["member", "manager"],
    schema: {
      sections: [
        {
          id: "targets",
          label: "今週の目標",
          fields: [
            { key: "tel_target", type: "number", label: "架電目標", required: true, unit: "件", min: 0 },
            { key: "appointment_target", type: "number", label: "アポ目標", required: true, unit: "件", min: 0 },
            { key: "revenue_target", type: "number", label: "売上目標", required: false, unit: "万円", min: 0 },
          ],
        },
        {
          id: "plan",
          label: "アクションプラン",
          fields: [
            { key: "focus_items", type: "textarea", label: "重点施策", required: true, placeholder: "注力する施策・企業" },
            { key: "content_plan", type: "textarea", label: "コンテンツ計画", required: false, placeholder: "記事制作・更新の計画" },
          ],
        },
      ],
    },
  },
];

// ─── Preset Map ──────────────────────────────────────────────────

const INDUSTRY_PRESETS: Record<IndustryType, PresetTemplate[]> = {
  recruitment: RECRUITMENT_PRESETS,
  staffing_agency: STAFFING_AGENCY_PRESETS,
  media: MEDIA_PRESETS,
};

// ─── Apply Function ─────────────────────────────────────────────

/**
 * 業種プリセットテンプレートをテナントに適用する。
 * 既存テンプレートを削除せず、プリセットを追加する形。
 */
export async function applyIndustryPresets(
  supabase: SupabaseClient,
  tenantId: string,
  industry: IndustryType
): Promise<{ success: boolean; data?: { applied: number }; error?: string }> {
  const presets = INDUSTRY_PRESETS[industry];
  if (!presets || presets.length === 0) {
    return { success: false, error: "未対応の業種です" };
  }

  try {
    // 既存のシステムテンプレート（前回のプリセット）を削除して入れ替え
    await supabase
      .from("report_templates")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("is_system", true);

    let applied = 0;

    for (const preset of presets) {
      const { error } = await supabase
        .from("report_templates")
        .insert({
          tenant_id: tenantId,
          name: preset.name,
          type: preset.type,
          target_roles: preset.target_roles,
          schema: preset.schema,
          is_system: true,
          is_published: true,
          version: 1,
        });

      if (error) {
        console.error(`[Onboarding] Failed to insert preset "${preset.name}":`, error);
      } else {
        applied++;
      }
    }

    return { success: true, data: { applied } };
  } catch (error) {
    console.error("[Onboarding] applyIndustryPresets error:", error);
    return { success: false, error: "テンプレートの適用に失敗しました" };
  }
}
