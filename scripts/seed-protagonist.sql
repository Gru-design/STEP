-- ============================================================
-- 株式会社プロタゴニスト シードデータ
-- Supabase SQL Editor で実行してください
-- ============================================================

-- ── 1. テナント ──
INSERT INTO tenants (id, name, plan, report_visibility)
VALUES (
  'a0000001-0000-0000-0000-000000000001',
  '株式会社プロタゴニスト',
  'professional',
  'team'
);

-- ── 2. Auth ユーザー作成 ──
-- パスワード: Step2024! (bcrypt hash)
-- ⚠️ Supabase の Auth > Users から手動作成するか、
--    以下のSQL で auth.users に直接 INSERT する

-- 鶴田 悠貴 (admin)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at
) VALUES (
  'b0000001-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'tsuruta@protagonist-inc.jp',
  crypt('Step2024!', gen_salt('bf')),
  now(),
  '{"tenant_id": "a0000001-0000-0000-0000-000000000001", "name": "鶴田 悠貴", "role": "admin"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated', now(), now()
);
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (
  'b0000001-0000-0000-0000-000000000001',
  'b0000001-0000-0000-0000-000000000001',
  '{"sub": "b0000001-0000-0000-0000-000000000001", "email": "tsuruta@protagonist-inc.jp"}'::jsonb,
  'email', 'b0000001-0000-0000-0000-000000000001', now(), now(), now()
);

-- 田内 将貴 (manager)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at
) VALUES (
  'b0000002-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'tauchi@protagonist-inc.jp',
  crypt('Step2024!', gen_salt('bf')),
  now(),
  '{"tenant_id": "a0000001-0000-0000-0000-000000000001", "name": "田内 将貴", "role": "manager"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated', now(), now()
);
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (
  'b0000002-0000-0000-0000-000000000002',
  'b0000002-0000-0000-0000-000000000002',
  '{"sub": "b0000002-0000-0000-0000-000000000002", "email": "tauchi@protagonist-inc.jp"}'::jsonb,
  'email', 'b0000002-0000-0000-0000-000000000002', now(), now(), now()
);

-- 土岐 裕哉 (member)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at
) VALUES (
  'b0000003-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'toki@protagonist-inc.jp',
  crypt('Step2024!', gen_salt('bf')),
  now(),
  '{"tenant_id": "a0000001-0000-0000-0000-000000000001", "name": "土岐 裕哉", "role": "member"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated', now(), now()
);
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (
  'b0000003-0000-0000-0000-000000000003',
  'b0000003-0000-0000-0000-000000000003',
  '{"sub": "b0000003-0000-0000-0000-000000000003", "email": "toki@protagonist-inc.jp"}'::jsonb,
  'email', 'b0000003-0000-0000-0000-000000000003', now(), now(), now()
);

-- 渥美 友将 (manager)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at
) VALUES (
  'b0000004-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  'atsumi@protagonist-inc.jp',
  crypt('Step2024!', gen_salt('bf')),
  now(),
  '{"tenant_id": "a0000001-0000-0000-0000-000000000001", "name": "渥美 友将", "role": "manager"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated', now(), now()
);
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (
  'b0000004-0000-0000-0000-000000000004',
  'b0000004-0000-0000-0000-000000000004',
  '{"sub": "b0000004-0000-0000-0000-000000000004", "email": "atsumi@protagonist-inc.jp"}'::jsonb,
  'email', 'b0000004-0000-0000-0000-000000000004', now(), now(), now()
);

-- 越田 太陽 (member)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at
) VALUES (
  'b0000005-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000000',
  'koshida@protagonist-inc.jp',
  crypt('Step2024!', gen_salt('bf')),
  now(),
  '{"tenant_id": "a0000001-0000-0000-0000-000000000001", "name": "越田 太陽", "role": "member"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated', now(), now()
);
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (
  'b0000005-0000-0000-0000-000000000005',
  'b0000005-0000-0000-0000-000000000005',
  '{"sub": "b0000005-0000-0000-0000-000000000005", "email": "koshida@protagonist-inc.jp"}'::jsonb,
  'email', 'b0000005-0000-0000-0000-000000000005', now(), now(), now()
);

-- ── 3. ユーザープロフィール更新 (トリガーで作成済み) ──
UPDATE users SET
  bio = '社員番号: PTG001 / 入社日: 2016-04-01 / 部門: IT',
  settings = '{"employee_id": "PTG001", "joined_at": "2016-04-01", "department": "IT"}'::jsonb
WHERE id = 'b0000001-0000-0000-0000-000000000001';

UPDATE users SET
  bio = '社員番号: PTG002 / 入社日: 2019-10-01 / 部門: IT',
  settings = '{"employee_id": "PTG002", "joined_at": "2019-10-01", "department": "IT"}'::jsonb
WHERE id = 'b0000002-0000-0000-0000-000000000002';

UPDATE users SET
  bio = '社員番号: PTG003 / 入社日: 2020-04-01 / 部門: IT',
  settings = '{"employee_id": "PTG003", "joined_at": "2020-04-01", "department": "IT"}'::jsonb
WHERE id = 'b0000003-0000-0000-0000-000000000003';

UPDATE users SET
  bio = '社員番号: PTG004 / 入社日: 2017-04-01 / 部門: IT',
  settings = '{"employee_id": "PTG004", "joined_at": "2017-04-01", "department": "IT"}'::jsonb
WHERE id = 'b0000004-0000-0000-0000-000000000004';

UPDATE users SET
  bio = '社員番号: PTG005 / 入社日: 2024-04-01 / 部門: IT',
  settings = '{"employee_id": "PTG005", "joined_at": "2024-04-01", "department": "IT"}'::jsonb
WHERE id = 'b0000005-0000-0000-0000-000000000005';

-- ── 4. チーム ──
INSERT INTO teams (id, tenant_id, name, manager_id)
VALUES (
  'c0000001-0000-0000-0000-000000000001',
  'a0000001-0000-0000-0000-000000000001',
  'IT事業部',
  'b0000002-0000-0000-0000-000000000002' -- 田内
);

-- ── 5. チームメンバー ──
INSERT INTO team_members (team_id, user_id, role) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'admin'),
  ('c0000001-0000-0000-0000-000000000001', 'b0000002-0000-0000-0000-000000000002', 'manager'),
  ('c0000001-0000-0000-0000-000000000001', 'b0000003-0000-0000-0000-000000000003', 'member'),
  ('c0000001-0000-0000-0000-000000000001', 'b0000004-0000-0000-0000-000000000004', 'manager'),
  ('c0000001-0000-0000-0000-000000000001', 'b0000005-0000-0000-0000-000000000005', 'member');

-- ── 6. テンプレート ──
INSERT INTO report_templates (tenant_id, name, type, target_roles, schema, is_system, is_published) VALUES
(
  'a0000001-0000-0000-0000-000000000001',
  'RAコンサルタント日報',
  'daily',
  '{"member","manager"}',
  '{"sections":[{"id":"activity","label":"活動実績","fields":[{"key":"new_approach_count","type":"number","label":"新規アプローチ件数","required":true,"unit":"件"},{"key":"meeting_records","type":"repeater","label":"商談記録","required":false,"fields":[{"key":"company_name","type":"text","label":"企業名","required":true},{"key":"status","type":"select_single","label":"ステータス","required":true,"options":["初回接触","ヒアリング済","提案中","条件交渉","成約","失注"]},{"key":"memo","type":"textarea","label":"メモ","required":false}]},{"key":"hearing_count","type":"number","label":"求人ヒアリング件数","required":true,"unit":"件"},{"key":"recommendation_count","type":"number","label":"推薦数","required":true,"unit":"件"}]},{"id":"reflection","label":"振り返り","fields":[{"key":"insights","type":"textarea","label":"所感・気づき","required":true,"placeholder":"今日の気づきや学びを記入してください"},{"key":"tomorrow_plan","type":"textarea","label":"明日の予定","required":true},{"key":"motivation","type":"rating","label":"モチベーション","required":true,"min":1,"max":5}]}]}',
  true, true
),
(
  'a0000001-0000-0000-0000-000000000001',
  '月曜チェックイン',
  'checkin',
  '{"member","manager"}',
  '{"sections":[{"id":"checkin","label":"チェックイン","fields":[{"key":"weekend_rating","type":"rating","label":"週末どうだった？","required":true,"min":1,"max":5},{"key":"weekend_comment","type":"textarea","label":"週末のコメント","required":false},{"key":"recommendation","type":"textarea","label":"チームにおすすめしたいこと","required":false},{"key":"motivation_comment","type":"textarea","label":"今週の意気込み","required":true}]}]}',
  true, true
),
(
  'a0000001-0000-0000-0000-000000000001',
  '週次行動計画',
  'plan',
  '{"member","manager"}',
  '{"sections":[{"id":"plan","label":"今週の計画","fields":[{"key":"focus_items","type":"textarea","label":"今週の重点項目","required":true},{"key":"approach_list","type":"repeater","label":"アプローチ予定リスト","required":false,"fields":[{"key":"company","type":"text","label":"企業名","required":true},{"key":"action","type":"text","label":"アクション","required":true},{"key":"due_date","type":"date","label":"期日","required":false}]},{"key":"follow_list","type":"repeater","label":"フォロー案件リスト","required":false,"fields":[{"key":"deal_name","type":"text","label":"案件名","required":true},{"key":"next_action","type":"text","label":"ネクストアクション","required":true},{"key":"due_date","type":"date","label":"期日","required":false}]}]}]}',
  true, true
);

-- ── 7. パイプラインステージ ──
INSERT INTO pipeline_stages (tenant_id, name, sort_order) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'アプローチ', 1),
  ('a0000001-0000-0000-0000-000000000001', 'ヒアリング', 2),
  ('a0000001-0000-0000-0000-000000000001', '求人受注', 3),
  ('a0000001-0000-0000-0000-000000000001', '推薦', 4),
  ('a0000001-0000-0000-0000-000000000001', '書類通過', 5),
  ('a0000001-0000-0000-0000-000000000001', '面接', 6),
  ('a0000001-0000-0000-0000-000000000001', '内定', 7),
  ('a0000001-0000-0000-0000-000000000001', '入社', 8);

-- ── 8. バッジ ──
INSERT INTO badges (name, description, icon, condition, rarity) VALUES
  ('ファーストステップ', '初回日報提出', '🎯', '{"type":"first_report"}', 'common'),
  ('7日連続', '7日連続で日報提出', '🔥', '{"type":"streak","days":7}', 'common'),
  ('30日連続', '30日連続で日報提出', '🔥', '{"type":"streak","days":30}', 'rare'),
  ('100日連続', '100日連続で日報提出', '🔥', '{"type":"streak","days":100}', 'epic'),
  ('月間目標達成', '月間目標を達成', '🏆', '{"type":"monthly_goal"}', 'rare'),
  ('ナレッジ初投稿', '初めてナレッジを投稿', '💡', '{"type":"first_knowledge"}', 'common'),
  ('リアクション50回', 'リアクションを50回送信', '👏', '{"type":"reaction_count","count":50}', 'rare'),
  ('全員からリアクション', 'チーム全員からリアクションを獲得', '⭐', '{"type":"all_reactions"}', 'epic'),
  ('四半期MVP', '四半期MVPに選出', '🌟', '{"type":"quarterly_mvp"}', 'legendary');

-- ── 9. レベル初期化 ──
INSERT INTO user_levels (user_id, level, xp) VALUES
  ('b0000001-0000-0000-0000-000000000001', 1, 0),
  ('b0000002-0000-0000-0000-000000000002', 1, 0),
  ('b0000003-0000-0000-0000-000000000003', 1, 0),
  ('b0000004-0000-0000-0000-000000000004', 1, 0),
  ('b0000005-0000-0000-0000-000000000005', 1, 0);
