-- ============================================================
-- STEP デモデータ一括投入SQL
-- Supabase SQL Editor で実行してください
--
-- ログイン情報 (共通パスワード: Demo2024!):
--   管理者:       demo-admin@step-app.jp
--   マネージャー: demo-manager@step-app.jp
--   メンバー:     demo-member@step-app.jp
--
-- 作成されるデータ:
--   テナント / ユーザー3名 / チーム / テンプレート2種
--   パイプライン7ステージ / 日報14日分 / 案件5件
--   週次計画2週分 / ナレッジ2件 / ピアボーナス
--   バッジ・レベル・リアクション・目標・ナッジ
-- ============================================================

-- ── 固定UUID ──
-- テナント
--   a0000000-0000-0000-0000-000000000001
-- ユーザー
--   b0000000-0000-0000-0000-000000000001  admin
--   b0000000-0000-0000-0000-000000000002  manager
--   b0000000-0000-0000-0000-000000000003  member

-- ============================================================
-- 1. テナント
-- ============================================================
INSERT INTO tenants (id, name, plan, report_visibility)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'デモ企業',
  'professional',
  'team'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Auth ユーザー (トリガーで public.users にも自動作成)
-- ============================================================

-- Admin: 山本 太郎
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'demo-admin@step-app.jp',
  crypt('Demo2024!', gen_salt('bf')),
  now(),
  '{"tenant_id": "a0000000-0000-0000-0000-000000000001", "name": "山本 太郎", "role": "admin"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated', now(), now()
);
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  '{"sub": "b0000000-0000-0000-0000-000000000001", "email": "demo-admin@step-app.jp"}'::jsonb,
  'email', 'b0000000-0000-0000-0000-000000000001', now(), now(), now()
);

-- Manager: 佐々木 あおい
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at
) VALUES (
  'b0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'demo-manager@step-app.jp',
  crypt('Demo2024!', gen_salt('bf')),
  now(),
  '{"tenant_id": "a0000000-0000-0000-0000-000000000001", "name": "佐々木 あおい", "role": "manager"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated', now(), now()
);
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000002',
  '{"sub": "b0000000-0000-0000-0000-000000000002", "email": "demo-manager@step-app.jp"}'::jsonb,
  'email', 'b0000000-0000-0000-0000-000000000002', now(), now(), now()
);

-- Member: 中村 翔太
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at
) VALUES (
  'b0000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'demo-member@step-app.jp',
  crypt('Demo2024!', gen_salt('bf')),
  now(),
  '{"tenant_id": "a0000000-0000-0000-0000-000000000001", "name": "中村 翔太", "role": "member"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated', now(), now()
);
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (
  'b0000000-0000-0000-0000-000000000003',
  'b0000000-0000-0000-0000-000000000003',
  '{"sub": "b0000000-0000-0000-0000-000000000003", "email": "demo-member@step-app.jp"}'::jsonb,
  'email', 'b0000000-0000-0000-0000-000000000003', now(), now(), now()
);

-- ============================================================
-- 2b. プロフィール補完
-- ============================================================
UPDATE users SET
  phone = '03-1234-5678',
  bio = 'デモ管理者。テナント設定やユーザー管理を担当。'
WHERE id = 'b0000000-0000-0000-0000-000000000001';

UPDATE users SET
  slack_id = 'U_DEMO_MGR',
  calendar_url = 'https://calendly.com/demo-manager',
  bio = 'デモマネージャー。チーム日報の承認やフィードバックを担当。'
WHERE id = 'b0000000-0000-0000-0000-000000000002';

UPDATE users SET
  phone = '090-0000-1234',
  bio = 'デモメンバー。営業活動と日報提出を行います。'
WHERE id = 'b0000000-0000-0000-0000-000000000003';

-- ============================================================
-- 3〜15. チーム・テンプレート・デモデータ一括投入
-- ============================================================
DO $$
DECLARE
  v_tenant_id  uuid := 'a0000000-0000-0000-0000-000000000001';
  v_admin_id   uuid := 'b0000000-0000-0000-0000-000000000001';
  v_mgr_id     uuid := 'b0000000-0000-0000-0000-000000000002';
  v_member_id  uuid := 'b0000000-0000-0000-0000-000000000003';
  v_team_id    uuid;
  v_tmpl_daily uuid;
  v_tmpl_checkin uuid;
  v_stage_ids  uuid[];
  v_day        date;
  v_report_id  uuid;
  v_plan_id    uuid;
BEGIN

  -- ── 3. チーム ──
  INSERT INTO teams (id, tenant_id, name, manager_id)
  VALUES (gen_random_uuid(), v_tenant_id, '営業チーム', v_mgr_id)
  RETURNING id INTO v_team_id;

  INSERT INTO team_members (team_id, user_id, role) VALUES
    (v_team_id, v_admin_id,  'admin'),
    (v_team_id, v_mgr_id,    'manager'),
    (v_team_id, v_member_id, 'member');

  -- ── 4. テンプレート: 営業日報 ──
  INSERT INTO report_templates (tenant_id, name, type, target_roles, schema, is_system, is_published, version)
  VALUES (
    v_tenant_id, '営業日報', 'daily',
    '{"member","manager"}',
    '{
      "sections": [
        {
          "id": "activity",
          "label": "活動実績",
          "fields": [
            {"key": "visit_count", "type": "number", "label": "訪問件数", "required": true, "unit": "件"},
            {"key": "call_count", "type": "number", "label": "架電件数", "required": true, "unit": "件"},
            {"key": "meeting_records", "type": "repeater", "label": "商談記録", "required": false, "fields": [
              {"key": "company_name", "type": "text", "label": "企業名", "required": true},
              {"key": "status", "type": "select_single", "label": "ステータス", "required": true, "options": ["初回接触","提案中","見積中","受注","失注"]},
              {"key": "memo", "type": "textarea", "label": "メモ", "required": false}
            ]}
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
    true, true, 1
  ) RETURNING id INTO v_tmpl_daily;

  -- ── 5. テンプレート: チェックイン ──
  INSERT INTO report_templates (tenant_id, name, type, target_roles, schema, is_system, is_published, version)
  VALUES (
    v_tenant_id, '月曜チェックイン', 'checkin',
    '{"member","manager"}',
    '{
      "sections": [
        {
          "id": "checkin",
          "label": "チェックイン",
          "fields": [
            {"key": "weekend_rating", "type": "rating", "label": "週末どうだった？", "required": true, "min": 1, "max": 5},
            {"key": "motivation_comment", "type": "textarea", "label": "今週の意気込み", "required": true}
          ]
        }
      ]
    }',
    true, true, 1
  ) RETURNING id INTO v_tmpl_checkin;

  -- ── 6. パイプライン ──
  INSERT INTO pipeline_stages (tenant_id, name, sort_order) VALUES
    (v_tenant_id, 'アプローチ', 1),
    (v_tenant_id, 'ヒアリング', 2),
    (v_tenant_id, '提案',       3),
    (v_tenant_id, '見積',       4),
    (v_tenant_id, '交渉',       5),
    (v_tenant_id, '受注',       6),
    (v_tenant_id, '失注',       7);

  SELECT array_agg(id ORDER BY sort_order) INTO v_stage_ids
  FROM pipeline_stages WHERE tenant_id = v_tenant_id;

  -- ── 7. 日報 (直近14日・平日のみ) ──
  FOR v_day IN
    SELECT d::date FROM generate_series(
      CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, '1 day'
    ) d WHERE EXTRACT(DOW FROM d) BETWEEN 1 AND 5
  LOOP
    -- メンバー日報
    INSERT INTO report_entries (tenant_id, user_id, template_id, report_date, data, status, submitted_at)
    VALUES (
      v_tenant_id, v_member_id, v_tmpl_daily, v_day,
      jsonb_build_object(
        'visit_count', floor(random() * 5 + 2)::int,
        'call_count', floor(random() * 15 + 5)::int,
        'insights', (ARRAY[
          '新規開拓先のA社から好感触を得た。来週提案書を持参する。',
          'B社の担当者と深い話ができた。ニーズが明確になり次のアクションが見えた。',
          '架電効率を見直した。午前中の方がつながりやすいことがデータから判明。',
          '商談3件完了。C社は見積もりフェーズに進む見込み。'
        ])[floor(random() * 4 + 1)::int],
        'tomorrow_plan', (ARRAY[
          '午前: A社訪問、午後: 新規架電10件',
          '提案資料作成、D社フォロー電話',
          '午前: 社内MTG、午後: E社・F社訪問'
        ])[floor(random() * 3 + 1)::int],
        'motivation', floor(random() * 2 + 3)::int
      ),
      'submitted',
      v_day + TIME '17:30'
    ) RETURNING id INTO v_report_id;

    -- マネージャーからリアクション (50%)
    IF random() > 0.5 THEN
      INSERT INTO reactions (entry_id, user_id, type, comment)
      VALUES (
        v_report_id, v_mgr_id,
        (ARRAY['like','fire','clap'])[floor(random() * 3 + 1)::int],
        CASE WHEN random() > 0.5 THEN (ARRAY[
          'いい動きですね！',
          '明日も頑張りましょう',
          'ナイスアクション！'
        ])[floor(random() * 3 + 1)::int] ELSE NULL END
      );
    END IF;

    -- マネージャー日報 (80%)
    IF random() > 0.2 THEN
      INSERT INTO report_entries (tenant_id, user_id, template_id, report_date, data, status, submitted_at)
      VALUES (
        v_tenant_id, v_mgr_id, v_tmpl_daily, v_day,
        jsonb_build_object(
          'visit_count', floor(random() * 3 + 1)::int,
          'call_count', floor(random() * 8 + 3)::int,
          'insights', (ARRAY[
            'チームの架電数が先週比20%増加。勢いが出てきた。',
            '中村さんのA社商談が順調。フォロー体制を整えたい。',
            'マネジメント時間の確保が課題。午後に集中して1on1を入れる。'
          ])[floor(random() * 3 + 1)::int],
          'tomorrow_plan', (ARRAY[
            '午前: チームMTG、午後: G社同行訪問',
            '1on1 × 2、戦略会議、数値レビュー'
          ])[floor(random() * 2 + 1)::int],
          'motivation', floor(random() * 2 + 3)::int
        ),
        'submitted',
        v_day + TIME '18:00'
      );
    END IF;
  END LOOP;

  -- ── 8. 案件 ──
  INSERT INTO deals (tenant_id, user_id, stage_id, company, title, value, due_date, status) VALUES
    (v_tenant_id, v_member_id, v_stage_ids[3], '株式会社テクノス',    'ITコンサル導入',   5000000, CURRENT_DATE + 14, 'active'),
    (v_tenant_id, v_member_id, v_stage_ids[4], 'ABC商事',            'SaaSリプレイス',   3200000, CURRENT_DATE + 7,  'active'),
    (v_tenant_id, v_member_id, v_stage_ids[1], 'グリーン工業',        '新規アプローチ',     NULL,   CURRENT_DATE + 30, 'active'),
    (v_tenant_id, v_mgr_id,    v_stage_ids[5], 'フューチャーデザイン', 'DX推進支援',       8000000, CURRENT_DATE + 3,  'active'),
    (v_tenant_id, v_member_id, v_stage_ids[6], 'スカイネット',        'セキュリティ監査',  1500000, CURRENT_DATE - 7,  'won');

  -- ── 9. 週次計画 ──
  -- 先週分 (承認済み)
  INSERT INTO weekly_plans (tenant_id, user_id, week_start, template_id, items, status, approved_by, approved_at, execution_rate)
  VALUES (
    v_tenant_id, v_member_id,
    date_trunc('week', CURRENT_DATE - INTERVAL '7 days')::date,
    v_tmpl_daily,
    '{"focus": "新規開拓 + 既存フォロー", "targets": [{"task": "A社提案書作成", "done": true}, {"task": "新規架電50件", "done": true}, {"task": "B社見積提出", "done": false}]}',
    'approved', v_mgr_id, NOW() - INTERVAL '5 days', 66.7
  ) RETURNING id INTO v_plan_id;

  -- 先週の振り返り
  INSERT INTO plan_reviews (tenant_id, plan_id, user_id, self_rating, went_well, to_improve, next_actions, manager_id, manager_comment, manager_reviewed_at)
  VALUES (
    v_tenant_id, v_plan_id, v_member_id,
    4,
    '新規架電は目標達成。A社提案が前進した。',
    'B社の見積が遅れた。見積作成の時間確保が課題。',
    '今週はB社見積を最優先で完了させる。',
    v_mgr_id,
    '架電頑張りました！見積は社内テンプレート使えば効率化できるので相談してください。',
    NOW() - INTERVAL '4 days'
  );

  -- 今週分 (提出済み)
  INSERT INTO weekly_plans (tenant_id, user_id, week_start, template_id, items, status)
  VALUES (
    v_tenant_id, v_member_id,
    date_trunc('week', CURRENT_DATE)::date,
    v_tmpl_daily,
    '{"focus": "B社見積完了 + テクノス社クロージング", "targets": [{"task": "B社見積提出", "done": false}, {"task": "テクノス社最終提案", "done": false}, {"task": "新規架電30件", "done": false}]}',
    'submitted'
  );

  -- ── 10. ナレッジ ──
  INSERT INTO knowledge_posts (tenant_id, user_id, title, body, tags) VALUES
  (
    v_tenant_id, v_member_id,
    '新規架電で有効だったトークスクリプト',
    E'先週試した新しいトークスクリプトが好反応でした。\n\n'
    || E'**ポイント:**\n'
    || E'1. 最初に相手の課題を仮説で提示する\n'
    || E'2. 「お忙しいところ恐縮ですが」ではなく「1分だけお時間いただけますか」\n'
    || E'3. 具体的な数字（導入企業数、改善率）を早めに出す\n\n'
    || E'アポ獲得率が 8% → 15% に改善しました。ぜひ試してみてください。',
    ARRAY['営業','架電','スクリプト']
  ),
  (
    v_tenant_id, v_mgr_id,
    '1on1で使える質問テンプレート',
    E'メンバーとの1on1で効果的だった質問をまとめます。\n\n'
    || E'**状況把握:**\n'
    || E'- 今週一番時間を使ったことは？\n'
    || E'- 困っていることで、自分で解決できそうなことは？\n\n'
    || E'**成長支援:**\n'
    || E'- 3ヶ月後にできるようになりたいことは？\n'
    || E'- 今の仕事で楽しいと感じる瞬間は？\n\n'
    || E'答えを急がず、沈黙を恐れないことが大事です。',
    ARRAY['マネジメント','1on1','コミュニケーション']
  );

  -- ── 11. ピアボーナス ──
  SELECT id INTO v_report_id FROM report_entries
  WHERE user_id = v_member_id AND status = 'submitted'
  ORDER BY report_date DESC LIMIT 1;

  IF v_report_id IS NOT NULL THEN
    INSERT INTO peer_bonuses (tenant_id, from_user_id, to_user_id, report_entry_id, message, bonus_date)
    VALUES (v_tenant_id, v_mgr_id, v_member_id, v_report_id, '今週の新規開拓、勢いがあって素晴らしいです！', CURRENT_DATE)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO peer_bonuses (tenant_id, from_user_id, to_user_id, message, bonus_date) VALUES
    (v_tenant_id, v_member_id, v_mgr_id,    '丁寧なフィードバックありがとうございます！', CURRENT_DATE - 1),
    (v_tenant_id, v_admin_id,  v_member_id, '営業資料の整理、助かりました！',             CURRENT_DATE - 2)
  ON CONFLICT DO NOTHING;

  -- ── 12. バッジ ──
  INSERT INTO badges (name, description, icon, condition, rarity) VALUES
    ('ファーストステップ', '初めて日報を提出しました',   '🚀', '{"type": "first_report"}',           'common'),
    ('7日連続',           '7日連続で日報を提出',         '🔥', '{"type": "streak", "days": 7}',      'common'),
    ('30日連続',          '30日連続で日報を提出',         '💪', '{"type": "streak", "days": 30}',     'rare'),
    ('ナレッジ初投稿',     '初めてナレッジを投稿',        '📝', '{"type": "first_knowledge"}',        'common')
  ON CONFLICT DO NOTHING;

  INSERT INTO user_badges (user_id, badge_id)
  SELECT v_member_id, id FROM badges WHERE name IN ('ファーストステップ', '7日連続')
  ON CONFLICT DO NOTHING;

  INSERT INTO user_badges (user_id, badge_id)
  SELECT v_mgr_id, id FROM badges WHERE name = 'ファーストステップ'
  ON CONFLICT DO NOTHING;

  -- ── 13. レベル・XP ──
  INSERT INTO user_levels (user_id, level, xp) VALUES
    (v_admin_id,  1,   0),
    (v_mgr_id,    2, 180),
    (v_member_id, 2, 220)
  ON CONFLICT (user_id) DO UPDATE SET level = EXCLUDED.level, xp = EXCLUDED.xp;

  -- ── 14. 目標 ──
  INSERT INTO goals (tenant_id, level, name, target_value, kpi_field_key, template_id, period_start, period_end, owner_id, team_id)
  VALUES (
    v_tenant_id, 'team', '月間売上 2,000万円', 20000000,
    'visit_count', v_tmpl_daily,
    date_trunc('month', CURRENT_DATE)::date,
    (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date,
    v_mgr_id, v_team_id
  );

  INSERT INTO goals (tenant_id, level, name, target_value, kpi_field_key, template_id, period_start, period_end, owner_id)
  VALUES (
    v_tenant_id, 'individual', '月間訪問 40件', 40,
    'visit_count', v_tmpl_daily,
    date_trunc('month', CURRENT_DATE)::date,
    (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date,
    v_member_id
  );

  -- ── 15. ナッジ ──
  INSERT INTO nudges (tenant_id, target_user_id, trigger_type, content, status) VALUES
    (v_tenant_id, v_member_id, 'deal_deadline',   'ABC商事の見積期限が7日後です。進捗を確認してください。', 'pending'),
    (v_tenant_id, v_mgr_id,    'deviation_alert', 'チーム売上目標に対して進捗が5%以上乖離しています。',     'pending');

  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '  デモデータ投入完了！';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '  管理者:       demo-admin@step-app.jp    / Demo2024!';
  RAISE NOTICE '  マネージャー: demo-manager@step-app.jp  / Demo2024!';
  RAISE NOTICE '  メンバー:     demo-member@step-app.jp   / Demo2024!';
  RAISE NOTICE '============================================================';

END $$;
