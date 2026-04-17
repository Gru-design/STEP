# STEP - 日報・マネジメントサイクル統合SaaS

## プロジェクト概要

「毎日1STEP、チームが強くなる。」
人材紹介・派遣・メディア向けのマルチテナント日報・週次計画・目標管理・ファネル管理プラットフォーム。
AI APIに依存せず、全機能をロジックベースで実装する。

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router) + TypeScript
- **DB**: Supabase Pro (PostgreSQL) + Row Level Security
- **ORM**: Drizzle ORM
- **認証**: Supabase Auth (メール/パスワード + Google OAuth)
- **ホスティング**: Vercel
- **UI**: Tailwind CSS v4 + shadcn/ui
- **検索**: PostgreSQL ts_vector (全文検索)
- **課金**: 請求書管理 (法人向け・銀行振込/口座振替・インボイス制度対応、Phase 7)。詳細は `docs/billing-design.md`
- **通知**: Vercel Cron + Supabase Realtime
- **法務**: 利用規約・プライバシー・特商法・DPA・SLA 等は `docs/legal/` に社内ドラフト保管 (外部公開前に顧問弁護士レビュー必須)

## ディレクトリ構造

```
step/
├── CLAUDE.md
├── docs/
│   ├── phases/           # Phase別実装指示書
│   │   ├── phase-0.md
│   │   ├── phase-1.md
│   │   ├── ...
│   │   └── phase-7.md
│   ├── spec-v02.md       # 仕様書
│   └── schema.sql        # DBスキーマ（全テーブル）
├── src/
│   ├── app/
│   │   ├── (auth)/       # 認証ページ (login, signup, forgot-password)
│   │   ├── (dashboard)/  # 認証後ページ
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx         # ダッシュボード
│   │   │   ├── reports/         # 日報・週報・チェックイン
│   │   │   ├── plans/           # 週次計画
│   │   │   ├── deals/           # 案件管理
│   │   │   ├── goals/           # 目標ツリー
│   │   │   ├── knowledge/       # ナレッジ
│   │   │   ├── weekly-digest/   # 週刊STEP
│   │   │   ├── team/            # チーム管理
│   │   │   ├── settings/        # テナント設定
│   │   │   └── admin/           # スーパーアドミン
│   │   ├── api/
│   │   │   ├── cron/            # Vercel Cron (ナッジ、週刊STEP生成)
│   │   │   └── webhooks/        # 外部連携Webhook
│   │   ├── layout.tsx
│   │   └── page.tsx             # ランディングページ
│   ├── components/
│   │   ├── ui/                  # shadcn/ui コンポーネント
│   │   ├── template-builder/    # テンプレートビルダー
│   │   ├── reports/             # 日報関連
│   │   ├── deals/               # ファネル関連
│   │   ├── goals/               # 目標関連
│   │   ├── gamification/        # レベル・バッジ
│   │   └── shared/              # 共通コンポーネント
│   ├── db/
│   │   ├── schema.ts            # Drizzle スキーマ定義
│   │   ├── migrations/          # マイグレーションファイル
│   │   └── seed.ts              # シードデータ
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts        # ブラウザ用クライアント
│   │   │   ├── server.ts        # Server Component用
│   │   │   ├── middleware.ts    # ミドルウェア用
│   │   │   └── admin.ts         # Service Role用（サーバーサイドのみ）
│   │   ├── auth/                # 認証ヘルパー
│   │   ├── nudge/               # ナッジエンジン
│   │   ├── gamification/        # レベル・バッジ計算
│   │   ├── goals/               # 目標進捗計算・乖離検知
│   │   ├── digest/              # 週刊STEP生成
│   │   └── utils.ts
│   ├── hooks/                   # カスタムフック
│   ├── types/                   # 型定義
│   └── middleware.ts            # Next.js ミドルウェア（認証ガード）
├── supabase/
│   ├── config.toml
│   ├── migrations/              # Supabase マイグレーション
│   └── seed.sql
├── public/
├── .env.local.example
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## デザインシステム

### カラー (Split-Complementary / 60-30-10)

**デザイン理論**: Teal を軸にした Split-Complementary 配色。温かみのある Stone 系ニュートラルで軽やかさを演出。

| 名前 | HEX | CSS変数 | 用途 |
|------|------|---------|------|
| Primary | #0D9488 | `--color-primary` | ボタン、見出し、ナビ active |
| Primary Hover | #0F766E | `--color-primary-hover` | ホバー状態 |
| Primary Light | #CCFBF1 | `--color-primary-light` | 選択背景、active 背景 |
| Primary Muted | #99F6E4 | `--color-primary-muted` | プログレスバー背景 |
| Accent | #F97316 | `--color-accent-color` | CTA、通知、ゲーミフィケーション |
| Background | #FFFFFF | `--color-background` | ページ背景 |
| Muted | #F5F5F4 | `--color-muted` | セクション背景、ホバー |
| Border | #E7E5E4 | `--color-border` | ボーダー |
| Foreground | #1C1917 | `--color-foreground` | 本文テキスト |
| Muted FG | #78716C | `--color-muted-foreground` | サブテキスト |
| Success | #16A34A | `--color-success` | 成功、目標達成 |
| Warning | #D97706 | `--color-warning` | 警告、注意 |
| Danger | #DC2626 | `--color-danger` | エラー、アラート |

### タイポグラフィ

- 日本語: BIZ UDPGothic (Google Fonts)
- 英数字: Inter (Google Fonts)
- 数値データ: JetBrains Mono (monospace)

### UIルール

- カードは `rounded-xl` + `border-border` + `shadow-sm` で軽やかな奥行き
- ボタンは `rounded-xl` + `h-11` (44px タップターゲット)
- `text-primary` / `text-muted-foreground` 等の CSS 変数クラスを使用（ハードコード hex 禁止）
- モバイルファースト設計。ブレークポイント: sm:640 md:768 lg:1024

## データベース設計原則

### マルチテナント

- 全テーブルに `tenant_id` カラムを持たせる
- Supabase RLS で行レベルセキュリティを実装
- `auth.jwt() ->> 'tenant_id'` でテナントIDを取得

### RLS ポリシーテンプレート

```sql
-- 基本パターン: 同一テナントのみアクセス可能
CREATE POLICY "tenant_isolation" ON {table_name}
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- マネージャー以上のみ閲覧可能
CREATE POLICY "manager_read" ON {table_name}
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('admin', 'manager')
  );
```

### JSONB 活用方針

- テンプレート定義 (schema) → JSONB
- 日報データ (data) → JSONB
- ペルソナ情報 (persona) → JSONB
- バッジ条件 (condition) → JSONB
- 設定値 (settings) → JSONB

## コーディング規約

### TypeScript

- strict モード必須
- `any` 禁止。型を明示的に定義
- Server Actions を優先使用 (API Routes は外部 Webhook のみ)
- Zod でバリデーション

### コンポーネント

- Server Component をデフォルト
- "use client" は最小限のインタラクティブコンポーネントのみ
- コンポーネントは単一責務
- Props は interface で定義

### ファイル命名

- コンポーネント: PascalCase (e.g., `TemplateBuilder.tsx`)
- ユーティリティ: camelCase (e.g., `calculateProgress.ts`)
- ページ: Next.js 規約 (e.g., `page.tsx`, `layout.tsx`)
- 型定義: camelCase (e.g., `reportTypes.ts`)

### エラーハンドリング

- Server Actions は `{ success: boolean, data?: T, error?: string }` を返す
- try/catch で Supabase エラーをラップ
- ユーザー向けエラーメッセージは日本語

## 4ロール権限

| ロール | role 値 | 説明 |
|--------|---------|------|
| スーパーアドミン | super_admin | プロタゴニスト運営。全テナントアクセス |
| 管理者 | admin | テナント内の全権限 |
| マネージャー | manager | チーム日報閲覧・承認・ナッジ受信 |
| メンバー | member | 日報提出・ピア閲覧・ナレッジ投稿 |

## 日報閲覧ポリシー

テナント設定 (`tenants.report_visibility`) で閲覧範囲を制御。テンプレート単位で上書き可能。

| 設定値 | 閲覧範囲 | 用途 |
|--------|----------|------|
| manager_only | マネージャー以上のみ | 機密性の高い情報を含む場合 |
| team (デフォルト) | 同一チーム全員 | ピアラーニング・情報共有 |
| tenant_all | テナント全員 | 全社的な透明性 |

判定ロジック:
1. テンプレートの `visibility_override` が設定されていればそちらを優先
2. 未設定なら `tenants.report_visibility` に従う
3. admin は常に全閲覧可能
4. super_admin は全テナント閲覧可能

## ユーザープロフィール

users テーブルに以下の連絡先・プロフィール情報を持つ:

| カラム | 用途 |
|--------|------|
| phone | 電話番号。プロフィールカードから直接発信可能 |
| slack_id | Slack メンバーID。プロフィールからDMリンク生成 |
| calendar_url | Calendly / Google Cal 予約ページURL。1on1予約ボタンに使用 |
| bio | 自己紹介文 (任意) |

### プロフィールカードUI
- ユーザーアバター + 名前 + ロール + チーム
- 連絡先アクション: 📞 電話 / 💬 Slack / 📅 1on1予約 / ✉️ メール
- レベル + XP バー + 獲得バッジ
- ストリークカウンター
- 1on1予約ボタンは calendar_url が設定されている場合のみ表示
- マネージャーの1on1アジェンダ画面にも予約リンクを表示

## テンプレートビルダー仕様

### テンプレート種別

| type | 用途 | 頻度 |
|------|------|------|
| daily | 日報 | 毎日終業時 |
| weekly | 週報 | 毎週金曜 |
| plan | 週次計画 | 毎週月曜 |
| checkin | チェックイン | 毎週月曜ログイン時 |

### フィールドタイプ

text, textarea, number, select_single, select_multi, date, rating, file, link, section, repeater

### schema JSONB 構造

```typescript
interface TemplateSchema {
  sections: {
    id: string;
    label: string;
    fields: {
      key: string;
      type: FieldType;
      label: string;
      required: boolean;
      placeholder?: string;
      unit?: string;        // number フィールドの単位
      min?: number;
      max?: number;
      options?: string[];   // select フィールドの選択肢
      fields?: Field[];     // repeater の子フィールド
    }[];
  }[];
}
```

## 承認ワークフロー

対象: 週次計画 (weekly_plans) + 案件判断 (deals)

ステータスフロー: draft → submitted → approved / rejected

- rejected の場合はマネージャーのコメント必須
- approval_logs テーブルに全履歴を保存

## ナッジエンジン仕様

全パターンがルールベース。Vercel Cron で定期実行。

| トリガー | ロジック | 通知先 |
|----------|----------|--------|
| 提出リマインダー | 17:00 に未提出者を検知 | 本人 |
| 再リマインダー | 18:00 に未提出者を検知 | 本人 |
| ソーシャルプルーフ | 提出率を計算して表示 | 全員 |
| モチベ低下 | rating <= 3 が 3日連続 | マネージャー |
| 着手案件期限 | deals.due_date < now かつステージ未変更 | 本人+MGR |
| 乖離アラート | 目標進捗率と計画ペースの差 >= 5% | 本人+MGR |

## ゲーミフィケーション仕様

### XP 付与ルール

| アクション | XP |
|-----------|-----|
| 日報提出 | 10 |
| 週次計画提出 | 15 |
| チェックイン回答 | 5 |
| リアクション送信 | 2 |
| ナレッジ投稿 | 20 |
| 目標達成 | 50 |

### レベル閾値

Lv1: 0, Lv2: 100, Lv3: 500, Lv4: 1500, Lv5: 5000

## 開発時の注意

1. **Phase 順に実装する**。前の Phase が完了してから次へ進む
2. **マイグレーションは Supabase CLI** (`supabase migration new`) で管理
3. **RLS ポリシーは必ずテスト**する。テナント分離の漏れは致命的
4. **シードデータ**を各 Phase で用意し、動作確認を容易にする
5. **テスト**は Vitest + React Testing Library。最低限 Server Actions のテスト
6. **環境変数**は `.env.local.example` に一覧を管理

## 既知の問題・注意事項

### リダイレクトループ (修正済み)

**症状**: ログイン後に `/dashboard` と `/login` の間で無限リダイレクトが発生する。

**原因**: `(dashboard)/layout.tsx` で `users` テーブルにレコードが見つからない場合、セッションを破棄せずに `/login` へリダイレクトしていた。middleware が認証済みユーザーを `/login` から `/dashboard` へ戻すため無限ループが発生。

**発生条件**:
- Supabase Auth にユーザーは存在するが `public.users` テーブルにレコードがない
- `user_metadata` に `tenant_id` または `name` が設定されていない
- `custom_access_token_hook` が未登録で JWT claims に `tenant_id`/`role` が含まれない

**対処法**:
- `layout.tsx` で `signOut()` してからリダイレクトする（ループ防止）
- 新規ユーザーセットアップ時は `auth.users.raw_user_meta_data` に `tenant_id`, `name`, `role` を必ず設定する
- Supabase Dashboard で `custom_access_token_hook` が有効になっていることを確認する

### SuperAdmin アカウント

- super_admin は CLI スクリプト (`scripts/create-super-admin.ts`) または Supabase SQL Editor から作成する
- ダッシュボード UI からは発行できない（セキュリティ上の意図的な設計）
- 「STEP運営」テナントに所属させる

### SuperAdmin ロール保護 (修正済み)

**症状**: ユーザー管理画面 (`/settings/users`) で super_admin のロールが admin/manager/member に変更できてしまい、管理権限を喪失する。

**原因**: `updateUserRole` に super_admin の保護チェックがなかった。また UI のロール選択ドロップダウンに super_admin が含まれていなかったため、変更操作で自動的に降格された。

**対処法**:
- `updateUserRole` / `deactivateUser` の両方で super_admin 対象の操作をサーバーサイドで拒否
- UI 側で super_admin ユーザーのロール変更ドロップダウンと削除ボタンを非表示
- 万が一降格した場合は Supabase SQL Editor で復旧:
  ```sql
  UPDATE public.users SET role = 'super_admin' WHERE id = '{user_id}';
  UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"super_admin"') WHERE id = '{user_id}';
  ```

## Phase 一覧

| Phase | 名称 | 指示書 |
|-------|------|--------|
| 0 | 基盤構築 | docs/phases/phase-0.md |
| 1 | テンプレートビルダー | docs/phases/phase-1.md |
| 2 | 日報コア | docs/phases/phase-2.md |
| 3 | ナッジ & ゲーミフィケーション | docs/phases/phase-3.md |
| 4 | 目標 & ファネル & ダッシュボード | docs/phases/phase-4.md |
| 5 | 計画 & 承認 & 週刊STEP | docs/phases/phase-5.md |
| 6 | 外部連携 | docs/phases/phase-6.md |
| 7 | 商用化 | docs/phases/phase-7.md |
