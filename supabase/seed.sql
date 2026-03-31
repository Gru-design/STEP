-- ============================================================
-- STEP Seed Data
-- Demo tenant, users, teams, and team_members
-- ============================================================

-- 1. Tenant
INSERT INTO tenants (id, name, plan, report_visibility)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'デモ株式会社',
  'free',
  'team'
);

-- 2. Users
-- NOTE: In production these are created via auth.users trigger.
--       For seeding we insert directly into public.users.

-- admin: 田中太郎
INSERT INTO users (id, tenant_id, email, role, name, phone, bio)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'admin@demo.com',
  'admin',
  '田中太郎',
  '090-1234-5678',
  'テナント管理者'
);

-- manager: 鈴木花子
INSERT INTO users (id, tenant_id, email, role, name, slack_id, calendar_url, bio)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'manager@demo.com',
  'manager',
  '鈴木花子',
  'U_SUZUKI',
  'https://calendly.com/suzuki',
  '営業マネージャー'
);

-- member1: 佐藤一郎
INSERT INTO users (id, tenant_id, email, role, name, phone)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  'member1@demo.com',
  'member',
  '佐藤一郎',
  '090-1111-2222'
);

-- member2: 高橋美咲
INSERT INTO users (id, tenant_id, email, role, name, slack_id)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  'member2@demo.com',
  'member',
  '高橋美咲',
  'U_TAKAHASHI'
);

-- member3: 山田健太
INSERT INTO users (id, tenant_id, email, role, name, calendar_url)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  '11111111-1111-1111-1111-111111111111',
  'member3@demo.com',
  'member',
  '山田健太',
  'https://calendly.com/yamada'
);

-- 3. Teams

-- 営業第一チーム (manager: 鈴木花子)
INSERT INTO teams (id, tenant_id, name, manager_id)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  '営業第一チーム',
  '33333333-3333-3333-3333-333333333333'
);

-- 営業第二チーム (no manager assigned)
INSERT INTO teams (id, tenant_id, name)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-1111-1111-1111-111111111111',
  '営業第二チーム'
);

-- 4. Team Members

-- 営業第一チーム: 鈴木花子 (manager), 佐藤一郎, 高橋美咲
INSERT INTO team_members (team_id, user_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'manager'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'member');

-- 営業第二チーム: 山田健太
INSERT INTO team_members (team_id, user_id, role) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '66666666-6666-6666-6666-666666666666', 'member');

-- ============================================================
-- Phase 1: Preset Templates
-- ============================================================

-- RA コンサルタント向け日報テンプレート
INSERT INTO report_templates (id, tenant_id, name, type, target_roles, schema, is_system, is_published, version)
VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '11111111-1111-1111-1111-111111111111',
  'RAコンサルタント日報',
  'daily',
  '{"member","manager"}',
  '{
    "sections": [
      {
        "id": "activity",
        "label": "活動実績",
        "fields": [
          {"key": "new_approach_count", "type": "number", "label": "新規アプローチ件数", "required": true, "unit": "件"},
          {"key": "meeting_records", "type": "repeater", "label": "商談記録", "required": false, "fields": [
            {"key": "company_name", "type": "text", "label": "企業名", "required": true},
            {"key": "status", "type": "select_single", "label": "ステータス", "required": true, "options": ["初回接触","ヒアリング済","提案中","条件交渉","成約","失注"]},
            {"key": "memo", "type": "textarea", "label": "メモ", "required": false}
          ]},
          {"key": "hearing_count", "type": "number", "label": "求人ヒアリング件数", "required": true, "unit": "件"},
          {"key": "recommendation_count", "type": "number", "label": "推薦数", "required": true, "unit": "件"}
        ]
      },
      {
        "id": "reflection",
        "label": "振り返り",
        "fields": [
          {"key": "insights", "type": "textarea", "label": "所感・気づき", "required": true, "placeholder": "今日の気づきや学びを記入してください"},
          {"key": "tomorrow_plan", "type": "textarea", "label": "明日の予定", "required": true},
          {"key": "motivation", "type": "rating", "label": "モチベーション", "required": true, "min": 1, "max": 5}
        ]
      }
    ]
  }',
  true,
  true,
  1
);

-- CA キャリアアドバイザー向け日報テンプレート
INSERT INTO report_templates (id, tenant_id, name, type, target_roles, schema, is_system, is_published, version)
VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '11111111-1111-1111-1111-111111111111',
  'CAキャリアアドバイザー日報',
  'daily',
  '{"member","manager"}',
  '{
    "sections": [
      {
        "id": "interview",
        "label": "面談実績",
        "fields": [
          {"key": "new_interview_count", "type": "number", "label": "新規面談数", "required": true, "unit": "件"},
          {"key": "interview_records", "type": "repeater", "label": "面談記録", "required": false, "fields": [
            {"key": "candidate_name", "type": "text", "label": "求職者名", "required": true},
            {"key": "phase", "type": "select_single", "label": "フェーズ", "required": true, "options": ["初回面談","書類作成","応募中","面接中","内定","入社","辞退"]},
            {"key": "memo", "type": "textarea", "label": "メモ", "required": false}
          ]},
          {"key": "doc_pass_count", "type": "number", "label": "書類選考通過", "required": true, "unit": "件"},
          {"key": "interview_set_count", "type": "number", "label": "面接設定", "required": true, "unit": "件"},
          {"key": "offer_count", "type": "number", "label": "内定数", "required": true, "unit": "件"}
        ]
      },
      {
        "id": "reflection",
        "label": "振り返り",
        "fields": [
          {"key": "insights", "type": "textarea", "label": "所感・気づき", "required": true, "placeholder": "今日の気づきや学びを記入してください"},
          {"key": "tomorrow_plan", "type": "textarea", "label": "明日の予定", "required": true},
          {"key": "motivation", "type": "rating", "label": "モチベーション", "required": true, "min": 1, "max": 5}
        ]
      }
    ]
  }',
  true,
  true,
  1
);

-- チェックインテンプレート
INSERT INTO report_templates (id, tenant_id, name, type, target_roles, schema, is_system, is_published, version)
VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '11111111-1111-1111-1111-111111111111',
  '月曜チェックイン',
  'checkin',
  '{"member","manager"}',
  '{
    "sections": [
      {
        "id": "checkin",
        "label": "チェックイン",
        "fields": [
          {"key": "weekend_rating", "type": "rating", "label": "週末どうだった？", "required": true, "min": 1, "max": 5},
          {"key": "weekend_comment", "type": "textarea", "label": "週末のコメント", "required": false, "placeholder": "良かったことや気になったことがあれば"},
          {"key": "recommendation", "type": "textarea", "label": "チームにおすすめしたいこと", "required": false, "placeholder": "本、記事、お店など何でも"},
          {"key": "motivation_comment", "type": "textarea", "label": "今週の意気込み", "required": true, "placeholder": "今週頑張りたいことを書いてください"}
        ]
      }
    ]
  }',
  true,
  true,
  1
);

-- 週次計画テンプレート
INSERT INTO report_templates (id, tenant_id, name, type, target_roles, schema, is_system, is_published, version)
VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  '11111111-1111-1111-1111-111111111111',
  '週次行動計画',
  'plan',
  '{"member","manager"}',
  '{
    "sections": [
      {
        "id": "plan",
        "label": "今週の計画",
        "fields": [
          {"key": "focus_items", "type": "textarea", "label": "今週の重点項目", "required": true, "placeholder": "今週特に注力するポイント"},
          {"key": "approach_list", "type": "repeater", "label": "アプローチ予定リスト", "required": false, "fields": [
            {"key": "company", "type": "text", "label": "企業名", "required": true},
            {"key": "action", "type": "text", "label": "アクション", "required": true},
            {"key": "due_date", "type": "date", "label": "期日", "required": false}
          ]},
          {"key": "follow_list", "type": "repeater", "label": "フォロー案件リスト", "required": false, "fields": [
            {"key": "deal_name", "type": "text", "label": "案件名", "required": true},
            {"key": "next_action", "type": "text", "label": "ネクストアクション", "required": true},
            {"key": "due_date", "type": "date", "label": "期日", "required": false}
          ]}
        ]
      }
    ]
  }',
  true,
  true,
  1
);
