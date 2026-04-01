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
) ON CONFLICT (id) DO NOTHING;

-- ── 2. Auth ユーザー作成 ──
-- パスワード: Step2024!

-- 既存データクリーンアップ (再実行対応)
DO $$
DECLARE
  v_ids uuid[] := ARRAY[
    'b0000001-0000-0000-0000-000000000001',
    'b0000002-0000-0000-0000-000000000002',
    'b0000003-0000-0000-0000-000000000003',
    'b0000004-0000-0000-0000-000000000004',
    'b0000005-0000-0000-0000-000000000005'
  ];
BEGIN
  DELETE FROM user_levels   WHERE user_id = ANY(v_ids);
  DELETE FROM user_badges   WHERE user_id = ANY(v_ids);
  DELETE FROM peer_bonuses  WHERE from_user_id = ANY(v_ids) OR to_user_id = ANY(v_ids);
  DELETE FROM reactions     WHERE user_id = ANY(v_ids);
  DELETE FROM report_comments WHERE user_id = ANY(v_ids);
  DELETE FROM nudges        WHERE target_user_id = ANY(v_ids);
  DELETE FROM approval_logs WHERE actor_id = ANY(v_ids);
  DELETE FROM deals         WHERE user_id = ANY(v_ids);
  DELETE FROM weekly_plans  WHERE user_id = ANY(v_ids);
  DELETE FROM report_entries WHERE user_id = ANY(v_ids);
  DELETE FROM knowledge_posts WHERE user_id = ANY(v_ids);
  DELETE FROM goals         WHERE owner_id = ANY(v_ids);
  DELETE FROM team_members  WHERE user_id = ANY(v_ids);
  DELETE FROM teams         WHERE manager_id = ANY(v_ids);
  DELETE FROM users         WHERE id = ANY(v_ids);
  DELETE FROM auth.identities WHERE user_id = ANY(v_ids);
  DELETE FROM auth.users    WHERE id = ANY(v_ids);
END $$;

-- 鶴田 悠貴 (admin)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data,
  is_sso_user, confirmation_token, recovery_token, email_change_token_new,
  aud, role, created_at, updated_at
) VALUES (
  'b0000001-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'tsuruta@protagonist-inc.jp',
  crypt('Step2024!', gen_salt('bf')),
  now(),
  '{"tenant_id": "a0000001-0000-0000-0000-000000000001", "name": "鶴田 悠貴", "role": "admin"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  false, '', '', '',
  'authenticated', 'authenticated', now(), now()
);
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (
  'b0000001-0000-0000-0000-000000000001',
  'b0000001-0000-0000-0000-000000000001',
  '{"sub": "b0000001-0000-0000-0000-000000000001", "email": "tsuruta@protagonist-inc.jp", "email_verified": true}'::jsonb,
  'email', 'b0000001-0000-0000-0000-000000000001', now(), now(), now()
);

-- 田内 将貴 (manager)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data,
  is_sso_user, confirmation_token, recovery_token, email_change_token_new,
  aud, role, created_at, updated_at
) VALUES (
  'b0000002-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'tauchi@protagonist-inc.jp',
  crypt('Step2024!', gen_salt('bf')),
  now(),
  '{"tenant_id": "a0000001-0000-0000-0000-000000000001", "name": "田内 将貴", "role": "manager"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  false, '', '', '',
  'authenticated', 'authenticated', now(), now()
);
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (
  'b0000002-0000-0000-0000-000000000002',
  'b0000002-0000-0000-0000-000000000002',
  '{"sub": "b0000002-0000-0000-0000-000000000002", "email": "tauchi@protagonist-inc.jp", "email_verified": true}'::jsonb,
  'email', 'b0000002-0000-0000-0000-000000000002', now(), now(), now()
);

-- 土岐 裕哉 (member)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data,
  is_sso_user, confirmation_token, recovery_token, email_change_token_new,
  aud, role, created_at, updated_at
) VALUES (
  'b0000003-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'toki@protagonist-inc.jp',
  crypt('Step2024!', gen_salt('bf')),
  now(),
  '{"tenant_id": "a0000001-0000-0000-0000-000000000001", "name": "土岐 裕哉", "role": "member"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  false, '', '', '',
  'authenticated', 'authenticated', now(), now()
);
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (
  'b0000003-0000-0000-0000-000000000003',
  'b0000003-0000-0000-0000-000000000003',
  '{"sub": "b0000003-0000-0000-0000-000000000003", "email": "toki@protagonist-inc.jp", "email_verified": true}'::jsonb,
  'email', 'b0000003-0000-0000-0000-000000000003', now(), now(), now()
);

-- 渥美 友将 (manager)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data,
  is_sso_user, confirmation_token, recovery_token, email_change_token_new,
  aud, role, created_at, updated_at
) VALUES (
  'b0000004-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  'atsumi@protagonist-inc.jp',
  crypt('Step2024!', gen_salt('bf')),
  now(),
  '{"tenant_id": "a0000001-0000-0000-0000-000000000001", "name": "渥美 友将", "role": "manager"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  false, '', '', '',
  'authenticated', 'authenticated', now(), now()
);
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (
  'b0000004-0000-0000-0000-000000000004',
  'b0000004-0000-0000-0000-000000000004',
  '{"sub": "b0000004-0000-0000-0000-000000000004", "email": "atsumi@protagonist-inc.jp", "email_verified": true}'::jsonb,
  'email', 'b0000004-0000-0000-0000-000000000004', now(), now(), now()
);

-- 越田 太陽 (member)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data,
  is_sso_user, confirmation_token, recovery_token, email_change_token_new,
  aud, role, created_at, updated_at
) VALUES (
  'b0000005-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000000',
  'koshida@protagonist-inc.jp',
  crypt('Step2024!', gen_salt('bf')),
  now(),
  '{"tenant_id": "a0000001-0000-0000-0000-000000000001", "name": "越田 太陽", "role": "member"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  false, '', '', '',
  'authenticated', 'authenticated', now(), now()
);
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (
  'b0000005-0000-0000-0000-000000000005',
  'b0000005-0000-0000-0000-000000000005',
  '{"sub": "b0000005-0000-0000-0000-000000000005", "email": "koshida@protagonist-inc.jp", "email_verified": true}'::jsonb,
  'email', 'b0000005-0000-0000-0000-000000000005', now(), now(), now()
);

-- ── 3. ユーザープロフィール更新 (トリガーで作成済み) ──
UPDATE users SET bio = '社員番号: PTG001 / 入社日: 2016-04-01 / 部門: IT', settings = '{"employee_id": "PTG001", "joined_at": "2016-04-01", "department": "IT"}'::jsonb WHERE id = 'b0000001-0000-0000-0000-000000000001';
UPDATE users SET bio = '社員番号: PTG002 / 入社日: 2019-10-01 / 部門: IT', settings = '{"employee_id": "PTG002", "joined_at": "2019-10-01", "department": "IT"}'::jsonb WHERE id = 'b0000002-0000-0000-0000-000000000002';
UPDATE users SET bio = '社員番号: PTG003 / 入社日: 2020-04-01 / 部門: IT', settings = '{"employee_id": "PTG003", "joined_at": "2020-04-01", "department": "IT"}'::jsonb WHERE id = 'b0000003-0000-0000-0000-000000000003';
UPDATE users SET bio = '社員番号: PTG004 / 入社日: 2017-04-01 / 部門: IT', settings = '{"employee_id": "PTG004", "joined_at": "2017-04-01", "department": "IT"}'::jsonb WHERE id = 'b0000004-0000-0000-0000-000000000004';
UPDATE users SET bio = '社員番号: PTG005 / 入社日: 2024-04-01 / 部門: IT', settings = '{"employee_id": "PTG005", "joined_at": "2024-04-01", "department": "IT"}'::jsonb WHERE id = 'b0000005-0000-0000-0000-000000000005';

-- ── 4. チーム ──
INSERT INTO teams (id, tenant_id, name, manager_id)
VALUES (
  'c0000001-0000-0000-0000-000000000001',
  'a0000001-0000-0000-0000-000000000001',
  'IT事業部',
  'b0000002-0000-0000-0000-000000000002'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO team_members (team_id, user_id, role) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'admin'),
  ('c0000001-0000-0000-0000-000000000001', 'b0000002-0000-0000-0000-000000000002', 'manager'),
  ('c0000001-0000-0000-0000-000000000001', 'b0000003-0000-0000-0000-000000000003', 'member'),
  ('c0000001-0000-0000-0000-000000000001', 'b0000004-0000-0000-0000-000000000004', 'manager'),
  ('c0000001-0000-0000-0000-000000000001', 'b0000005-0000-0000-0000-000000000005', 'member')
ON CONFLICT DO NOTHING;

-- ── 5. テンプレート ──
INSERT INTO report_templates (tenant_id, name, type, target_roles, schema, is_system, is_published, version)
VALUES (
  'a0000001-0000-0000-0000-000000000001',
  'RAコンサルタント日報', 'daily', '{"member","manager"}',
  '{"sections":[{"id":"activity","label":"活動実績","fields":[{"key":"new_approach_count","type":"number","label":"新規アプローチ件数","required":true,"unit":"件"},{"key":"hearing_count","type":"number","label":"求人ヒアリング件数","required":true,"unit":"件"},{"key":"recommendation_count","type":"number","label":"推薦数","required":true,"unit":"件"}]},{"id":"reflection","label":"振り返り","fields":[{"key":"insights","type":"textarea","label":"所感・気づき","required":true},{"key":"tomorrow_plan","type":"textarea","label":"明日の予定","required":true},{"key":"motivation","type":"rating","label":"モチベーション","required":true,"min":1,"max":5}]}]}',
  true, true, 1
) ON CONFLICT DO NOTHING;

INSERT INTO report_templates (tenant_id, name, type, target_roles, schema, is_system, is_published, version)
VALUES (
  'a0000001-0000-0000-0000-000000000001',
  '月曜チェックイン', 'checkin', '{"member","manager"}',
  '{"sections":[{"id":"checkin","label":"チェックイン","fields":[{"key":"weekend_rating","type":"rating","label":"週末どうだった？","required":true,"min":1,"max":5},{"key":"motivation_comment","type":"textarea","label":"今週の意気込み","required":true}]}]}',
  true, true, 1
) ON CONFLICT DO NOTHING;

-- ── 6. パイプライン ──
INSERT INTO pipeline_stages (tenant_id, name, sort_order) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'アプローチ', 1),
  ('a0000001-0000-0000-0000-000000000001', 'ヒアリング', 2),
  ('a0000001-0000-0000-0000-000000000001', '求人受注', 3),
  ('a0000001-0000-0000-0000-000000000001', '推薦', 4),
  ('a0000001-0000-0000-0000-000000000001', '書類通過', 5),
  ('a0000001-0000-0000-0000-000000000001', '面接', 6),
  ('a0000001-0000-0000-0000-000000000001', '内定', 7),
  ('a0000001-0000-0000-0000-000000000001', '入社', 8)
ON CONFLICT DO NOTHING;

-- ── 7. バッジ ──
INSERT INTO badges (name, description, icon, condition, rarity) VALUES
  ('ファーストステップ', '初回日報提出', '🎯', '{"type": "first_report"}', 'common'),
  ('7日連続', '7日連続で日報提出', '🔥', '{"type": "streak", "days": 7}', 'common'),
  ('30日連続', '30日連続で日報提出', '🔥', '{"type": "streak", "days": 30}', 'rare')
ON CONFLICT DO NOTHING;

-- ── 8. レベル初期化 ──
INSERT INTO user_levels (user_id, level, xp) VALUES
  ('b0000001-0000-0000-0000-000000000001', 1, 0),
  ('b0000002-0000-0000-0000-000000000002', 1, 0),
  ('b0000003-0000-0000-0000-000000000003', 1, 0),
  ('b0000004-0000-0000-0000-000000000004', 1, 0),
  ('b0000005-0000-0000-0000-000000000005', 1, 0)
ON CONFLICT (user_id) DO NOTHING;
