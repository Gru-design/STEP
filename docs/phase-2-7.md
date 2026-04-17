# Phase 2: 日報コア (W6-8)

## ゴール
メンバーがテンプレートに基づいて日報を入力・提出し、チーム内で閲覧・リアクションできる状態にする。

## タスク一覧

### 2-1. テーブル追加
```sql
CREATE TABLE report_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  template_id UUID REFERENCES report_templates(id) NOT NULL,
  report_date DATE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, template_id, report_date) -- 1日1テンプレート1エントリ
);

CREATE TABLE reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID REFERENCES report_entries(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'fire', 'clap', 'heart', 'eyes')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

RLS: report_entries は同一テナント＋チーム所属メンバー間で閲覧可能。manager/admin は配下の全日報を閲覧可能。

### 2-2. 日報入力フォーム
`src/app/(dashboard)/reports/new/page.tsx`:
- テンプレート選択 (公開済みテンプレートから)
- テンプレートの schema に基づいて動的フォームを生成
- `src/components/reports/DynamicForm.tsx` - JSONB schema からフォームを動的レンダリング
- 下書き保存 + 提出ボタン
- モバイル: スワイプでセクション遷移、大きなタップターゲット

### 2-3. 日報一覧・詳細
`src/app/(dashboard)/reports/page.tsx`:
- チームフィードとして日報をタイムライン表示
- 日付でフィルタ、メンバーでフィルタ
- カード形式: ユーザーアバター + 名前 + 日付 + 要約 (最初のテキストフィールド)

`src/app/(dashboard)/reports/[id]/page.tsx`:
- 日報詳細表示
- リアクションボタン (5種のemoji)
- コメント入力フォーム

### 2-4. マイ日報
- 自分の日報履歴をカレンダービュー + リストビューで表示
- 提出状況のヒートマップ (GitHub の contribution graph 風)

### 2-5. Server Actions
- `createReportEntry(templateId, date, data)` - 日報作成/下書き保存
- `submitReportEntry(id)` - 日報提出
- `addReaction(entryId, type, comment?)` - リアクション追加

## 完了条件
- [ ] テンプレートに基づいた動的フォームで日報入力できる
- [ ] 下書き保存と提出ができる
- [ ] チームメンバーの日報がフィードで閲覧できる
- [ ] リアクション・コメントができる
- [ ] モバイルで2分以内に提出できるUI

---

# Phase 3: ナッジ & ゲーミフィケーション (W9-11)

## ゴール
ナッジエンジン (ルールベース) とゲーミフィケーション (レベル・バッジ) が動作する状態にする。

## タスク一覧

### 3-1. テーブル追加
```sql
CREATE TABLE nudges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  target_user_id UUID REFERENCES users(id) NOT NULL,
  trigger_type TEXT NOT NULL, -- 'reminder' | 'social_proof' | 'motivation_drop' | 'deal_overdue' | 'goal_deviation'
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'actioned', 'dismissed')),
  actioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,       -- emoji or icon name
  condition JSONB NOT NULL, -- {"type": "streak", "days": 7} etc.
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  badge_id UUID REFERENCES badges(id) NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

CREATE TABLE user_levels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL UNIQUE,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3-2. ナッジエンジン実装
`src/lib/nudge/`:
- `engine.ts` - ナッジ判定ロジック (各トリガーのルール)
- `sender.ts` - 通知送信 (Supabase Realtime + メール)

`src/app/api/cron/nudge/route.ts` (Vercel Cron):
- 17:00 実行: 未提出者検知 → リマインダー生成
- 18:00 実行: 再リマインダー
- モチベーション低下チェック (日次)

`vercel.json`:
```json
{ "crons": [{ "path": "/api/cron/nudge", "schedule": "0 8,9 * * 1-5" }] }
```
※ UTC で設定 (JST 17:00 = UTC 08:00)

### 3-3. ソーシャルプルーフUI
- 日報入力画面の上部に「チームの○○%が提出済み」を表示
- リアルタイム更新 (Supabase Realtime)

### 3-4. ストリークカウンター
- ユーザーのプロフィールカードに連続提出日数を表示
- 日報提出時にストリーク計算

### 3-5. ゲーミフィケーションエンジン
`src/lib/gamification/`:
- `xp.ts` - XP 付与ロジック (CLAUDE.md の XP 付与ルール参照)
- `level.ts` - レベル判定
- `badge-checker.ts` - バッジ獲得条件チェック (report_entries, user_levels を参照)

### 3-6. バッジ・レベルUI
- プロフィールにレベル + XP バー + 獲得バッジ一覧
- バッジ獲得時のトースト通知
- バッジカタログ (全バッジ一覧、未獲得はグレーアウト)

### 3-7. バッジシードデータ
初期バッジ定義:
- 🎯 ファーストステップ (初回日報提出)
- 🔥 7日連続 / 30日連続 / 100日連続
- 🏆 月間目標達成
- 💡 ナレッジ初投稿
- 👏 リアクション50回送信
- ⭐ 全員からリアクションもらった
- 🌟 四半期MVP (legendary)

## 完了条件
- [ ] 17:00/18:00 にリマインダーが送信される
- [ ] ソーシャルプルーフが表示される
- [ ] ストリークが正しくカウントされる
- [ ] 日報提出でXPが加算され、レベルが上がる
- [ ] 条件を満たすとバッジが自動付与される

---

# Phase 4: 目標 & ファネル & ダッシュボード (W12-15)

## ゴール
目標ツリー、ファネル管理、KPIダッシュボードが動作する状態にする。

## タスク一覧

### 4-1. テーブル追加
```sql
CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  parent_id UUID REFERENCES goals(id),
  level TEXT NOT NULL CHECK (level IN ('company', 'department', 'team', 'individual')),
  name TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  kpi_field_key TEXT,          -- テンプレートの数値フィールドキーと紐付け
  template_id UUID REFERENCES report_templates(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  owner_id UUID REFERENCES users(id),
  team_id UUID REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE goal_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  actual_value NUMERIC NOT NULL DEFAULT 0,
  progress_rate NUMERIC NOT NULL DEFAULT 0,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pipeline_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  conversion_target NUMERIC, -- 目標通過率
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  stage_id UUID REFERENCES pipeline_stages(id) NOT NULL,
  company TEXT NOT NULL,
  title TEXT,
  value NUMERIC,
  persona JSONB DEFAULT '{}', -- {name, position, decision_points, history, memo}
  due_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'hold')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE deal_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  from_stage UUID REFERENCES pipeline_stages(id),
  to_stage UUID REFERENCES pipeline_stages(id) NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4-2. 目標ツリーUI
`src/app/(dashboard)/goals/page.tsx`:
- 目標ツリーを階層表示 (company → department → team → individual)
- 各ノードに進捗率バー表示
- 目標作成: 名前, ターゲット値, KPIフィールド紐付け, 期間, オーナー
- ドリルダウンで詳細表示

### 4-3. 目標進捗自動計算
`src/lib/goals/progress.ts`:
- 日報の数値フィールドを集計して actual_value を算出
- report_entries.data から kpi_field_key に該当する値を SUM
- 日次で goal_snapshots に保存 (Vercel Cron)

### 4-4. 乖離アラート
`src/lib/goals/deviation.ts`:
- 計画ペース = target_value × (経過日数 / 全期間日数)
- 乖離率 = (計画ペース - actual_value) / 計画ペース × 100
- 5% 以上で nudge を生成

### 4-5. ファネル管理ページ
`src/app/(dashboard)/deals/page.tsx`:
- カンバンビュー (ステージ別に案件カードを表示)
- D&D でステージ間移動 → deal_history に記録
- 案件カード: 企業名, 金額, 期限, ペルソナの一部

`src/app/(dashboard)/deals/[id]/page.tsx`:
- 案件詳細 + ペルソナ情報 (固定フィールド)
- ステージ履歴タイムライン
- 承認ワークフロー (Phase 5 で接続)

### 4-6. ファネルビジュアライゼーション
- 各ステージの件数と歩留まり率をファネルチャートで表示
- recharts の FunnelChart を使用

### 4-7. KPIダッシュボード
`src/app/(dashboard)/page.tsx` (ダッシュボードトップ):
- ロール別ビュー:
  - **メンバー**: 自分のKPI, ストリーク, レベル, 今日の提出状況
  - **マネージャー**: チーム提出率ヒートマップ, モチベーション推移, KPIトレンド, ナッジ対応
  - **Admin**: 全チーム横断, 乖離アラート一覧, ファネル概要
- recharts で折れ線グラフ, 棒グラフ
- CSVエクスポートボタン

### 4-8. パイプラインプリセット
RA向けプリセット: アプローチ → ヒアリング → 求人受注 → 推薦 → 書類通過 → 面接 → 内定 → 入社

## 完了条件
- [ ] 目標ツリーを4階層で作成・表示できる
- [ ] 日報の数値が目標に自動ロールアップされる
- [ ] 5%以上乖離でアラートが発火する
- [ ] 案件をカンバンで管理できる
- [ ] ペルソナ情報を記録できる
- [ ] KPIダッシュボードがロール別に表示される
- [ ] CSVエクスポートができる

---

# Phase 5: 計画 & 承認 & 週刊STEP (W16-19)

## ゴール
週次行動計画・月曜チェックイン・承認ワークフロー・週刊STEP・1on1アジェンダ・ナレッジ共有が動作する状態にする。

## タスク一覧

### 5-1. テーブル追加
```sql
CREATE TABLE weekly_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  week_start DATE NOT NULL,         -- その週の月曜日
  template_id UUID REFERENCES report_templates(id),
  items JSONB NOT NULL DEFAULT '{}', -- テンプレートに基づく計画データ
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  execution_rate NUMERIC,           -- 計画実行率 (自動計算)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

CREATE TABLE approval_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('weekly_plan', 'deal')),
  target_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected')),
  actor_id UUID REFERENCES users(id) NOT NULL,
  comment TEXT,           -- rejected 時は必須
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE knowledge_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  search_vector TSVECTOR, -- PostgreSQL全文検索用
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 全文検索インデックス
CREATE INDEX knowledge_search_idx ON knowledge_posts USING GIN (search_vector);

-- search_vector 自動更新トリガー
CREATE OR REPLACE FUNCTION update_knowledge_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple',
    COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.body, '') || ' ' || array_to_string(COALESCE(NEW.tags, '{}'), ' ')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_search_update
  BEFORE INSERT OR UPDATE ON knowledge_posts
  FOR EACH ROW EXECUTE FUNCTION update_knowledge_search_vector();

CREATE TABLE weekly_digests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  week_start DATE NOT NULL,
  rankings JSONB NOT NULL DEFAULT '{}',  -- {performance:[], activity:[], step:[]}
  mvp JSONB NOT NULL DEFAULT '{}',       -- {number_mvp:{}, process_mvp:{}}
  stats JSONB NOT NULL DEFAULT '{}',     -- 集計データ
  badges_earned JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',    -- チェックインの「おすすめ」ピックアップ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, week_start)
);
```

### 5-2. 週次計画ページ
`src/app/(dashboard)/plans/page.tsx`:
- 週次計画の作成・閲覧
- テンプレート (type: 'plan') に基づく動的フォーム
- 承認ステータス表示 (draft → submitted → approved/rejected)
- 差戻しコメント表示
- 計画実行率の表示 (日報実績との自動照合)

### 5-3. 月曜チェックイン
- ログイン時にチェックイン未回答ならモーダル表示
- テンプレート (type: 'checkin') に基づく
- report_entries に保存 (type: 'checkin')
- 回答内容はチームフィードにカード表示

### 5-4. 承認ワークフロー
`src/components/shared/ApprovalFlow.tsx`:
- 提出 → マネージャーに通知
- 承認/差戻しボタン + コメント入力
- approval_logs に全履歴保存
- 週次計画と案件判断の両方に適用

### 5-5. 計画vs実績照合
`src/lib/plans/execution-rate.ts`:
- 週次計画のリピーターフィールド (アプローチ予定等) と日報の実績を照合
- フィールドキーのマッチングで自動計算
- 週末に Vercel Cron で execution_rate を更新

### 5-6. 週刊STEP生成
`src/app/api/cron/weekly-digest/route.ts` (毎週月曜 AM 実行):
- ランキング3種の集計 (SQL で report_entries, deals, reactions を集計)
- MVP 2枠の選出 (数字MVP: KPI達成率1位, プロセスMVP: XP獲得量1位)
- バッジ獲得者リスト
- チェックインの「おすすめ」ピックアップ
- weekly_digests テーブルに保存

`src/app/(dashboard)/weekly-digest/page.tsx`:
- 週刊STEPの表示ページ
- ランキング表 (1位〜10位)
- MVP紹介カード
- バッジ獲得者・レベルアップ者
- おすすめピックアップ

### 5-7. 1on1アジェンダ生成
`src/app/(dashboard)/team/1on1/[userId]/page.tsx`:
- マネージャーが部下のアジェンダをワンクリックで生成
- テンプレート自動埋め込み:
  - 今週のKPI推移 (数値フィールドの集計)
  - 提出率
  - モチベーションレーティング推移
  - 承認履歴 (差戻しがあれば表示)
  - 前回の1on1メモ (手動記入)

### 5-8. ナレッジ共有
`src/app/(dashboard)/knowledge/page.tsx`:
- ナレッジ投稿一覧 (タグでフィルタ)
- 新規投稿フォーム (タイトル + 本文 + タグ)
- 全文検索バー (ts_vector)
- 過去日報のテキストフィールドも検索対象 (report_entries にも search_vector 追加)

### 5-9. コンディション可視化
`src/components/shared/ConditionChart.tsx`:
- モチベーションレーティング推移を recharts で折れ線グラフ
- チーム平均 vs 個人のオーバーレイ
- 月曜チェックイン vs 金曜日報のレーティング比較

## 完了条件
- [ ] 週次計画を作成・提出・承認/差戻しできる
- [ ] 月曜ログイン時にチェックインモーダルが表示される
- [ ] 計画実行率が自動計算される
- [ ] 週刊STEPが毎週自動生成される
- [ ] ランキング・MVP・バッジが表示される
- [ ] 1on1アジェンダがワンクリックで生成できる
- [ ] ナレッジを投稿・検索できる
- [ ] コンディション推移グラフが表示される

---

# Phase 6: 外部連携 (W20-23)

## ゴール
Google Calendar・Slack/Teams 通知が動作する状態にする。

## タスク一覧

### 6-1. テーブル追加
```sql
CREATE TABLE integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google_calendar', 'gmail', 'slack', 'teams', 'cti')),
  credentials JSONB NOT NULL DEFAULT '{}', -- 暗号化して保存
  settings JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  source TEXT NOT NULL, -- 'google_calendar' | 'gmail' | 'cti' | 'manual'
  raw_data JSONB NOT NULL,
  collected_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6-2. Google Calendar 連携
- OAuth 2.0 で Google Calendar API にアクセス
- 当日の予定を取得 → activity_logs に保存
- 日報入力時に活動ログとしてプリセット表示

### 6-3. Slack/Teams 通知
- Incoming Webhook で通知送信
- 対象: 日報提出通知, ナッジ, 週刊STEP
- 設定画面で Webhook URL を登録

### 6-4. 連携設定ページ
`src/app/(dashboard)/settings/integrations/page.tsx`:
- 連携先一覧 (接続状態表示)
- OAuth 接続ボタン
- Webhook URL 設定

## 完了条件
- [ ] Google Calendar の予定が日報にプリセットされる
- [ ] Slack に日報提出通知が送信される
- [ ] 連携設定画面で接続/切断ができる

---

# Phase 7: 商用化 (W24-28)

## ゴール
課金システム・スーパーアドミン管理画面を完成させ、商用SaaSとしてローンチ可能にする。

## タスク一覧

### 7-1. 請求書管理 (法人向け・インボイス制度対応)
本プロダクトは法人向け B2B SaaS のため、Stripe 等のオンライン決済は採用せず、
請求書払い (銀行振込 / 口座振替) を課金の中核とする。詳細は `docs/billing-design.md` を参照。

- DB: `billing_accounts`, `billing_contracts`, `billing_seat_snapshots`, `invoices`, `invoice_items`, `invoice_payments`
  (マイグレーション `00032_billing_invoices.sql`)
- プラン: Free (5名、無償), Starter (¥1,200/人), Professional (¥2,000/人), Enterprise (個別)
- 月次シート数スナップショットに基づく請求計算 (`calculation_method='max_mid_and_end'`)
- 適格請求書等保存方式 (インボイス制度) 対応: 登録番号、税率区分、端数処理
- 発行フロー: draft → issued → sent → paid (部分入金に対応)
- 電子帳簿保存法対応の PDF 保管 (Supabase Storage、7年)
- 月次 Cron: 前月締め → invoices(draft) 自動生成 (advisory lock で二重発火防止)
- super_admin のみが契約登録・請求発行・入金消込を実施 (member/manager は閲覧不可)

### 7-2. プラン機能制限
`src/lib/plan-limits.ts`:
- Free: 5ユーザー, プリセットテンプレートのみ, 日報・ピアフィード・チェックイン
- Starter: + テンプレートビルダー, ナッジ, ゲーミフィケーション, CSV
- Professional: + 目標, ファネル, 週次計画&承認, 週刊STEP, 1on1, ナレッジ, 外部連携
- Enterprise: + SSO, 監査ログ, API

### 7-3. スーパーアドミン管理画面
`src/app/(dashboard)/admin/`:
- テナント管理: 一覧, 新規発行, プラン変更, 停止/解約
- システムテンプレート管理: プリセットの CRUD
- 全テナントダッシュボード: アクティブユーザー数, 提出率, MRR推移
- システム設定: メールテンプレート, 通知設定

### 7-4. ランディングページ
`src/app/page.tsx`:
- プロダクト紹介
- 機能一覧
- 料金プラン
- お問い合わせフォーム
- CTA: 無料で始める

### 7-5. チーム対抗戦 (Could)
- チーム間で週次総合スコアを競う
- スコア = 提出率 × 30 + 目標達成率 × 40 + STEP活動 × 30
- 週刊STEPにチームランキングを追加

### 7-6. 派遣向けテンプレート拡張 (Could)
- 派遣スタッフ向け日報プリセット
- HakenOS 連携の検討

### 7-7. 本番デプロイ
- Vercel 本番環境設定
- カスタムドメイン設定
- 環境変数の本番値設定
- Supabase Pro の本番設定確認

## 完了条件
- [ ] 請求書管理 (法人向け銀行振込・口座振替) が運用できる
- [ ] 適格請求書等保存方式 (インボイス制度) に準拠した請求書が発行できる
- [ ] プラン別の機能制限が正しく動作する
- [ ] スーパーアドミンでテナント管理ができる
- [ ] ランディングページが表示される
- [ ] 本番環境にデプロイされ、一般ユーザーがアクセスできる
