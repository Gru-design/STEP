# STEP - 日報・マネジメントサイクル統合SaaS

> 毎日1STEP、チームが強くなる。

人材紹介・派遣・メディア向けのマルチテナント日報・週次計画・目標管理・ファネル管理プラットフォーム。

---

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フレームワーク | Next.js 15 (App Router) + TypeScript |
| データベース | Supabase (PostgreSQL) + Row Level Security |
| 認証 | Supabase Auth (メール/パスワード + Google OAuth) |
| ORM | Drizzle ORM |
| UI | Tailwind CSS v4 + shadcn/ui |
| テスト | Vitest + React Testing Library |
| CI/CD | GitHub Actions |
| ホスティング | Vercel |

## 主要機能

| 機能 | 説明 |
|------|------|
| 日報管理 | テンプレートベースの日報作成・提出・ピアフィード |
| 週次計画 | 計画作成・承認ワークフロー・実行率自動算出 |
| 目標管理 | ツリー構造の目標設定・KPI自動追跡・乖離アラート |
| 案件管理 | カンバン + リストビュー・ファネル分析 |
| ナッジエンジン | ルールベースの提出リマインダー・モチベ低下検知 |
| ゲーミフィケーション | XP・レベル・バッジ・ストリークカウンター |
| ナレッジ | チーム内ナレッジベース・タグ・全文検索 |
| 週刊STEP | テナント週次ダイジェスト自動生成 |
| 1on1管理 | マネージャー向けアジェンダ・感情トレンド |
| ユーザー管理 | 招待・ロール変更・無効化・監査ログ |
| データエクスポート | ユーザー・日報・案件・目標のCSVエクスポート |
| 公開API | REST API (Bearer / API Key認証) |
| Webhook | HMAC署名付きイベント通知 |
| PWA | モバイルホーム画面追加・オフラインキャッシュ |
| ホワイトラベル | テナント別カラー・ロゴ・アプリ名 |

## ロール

| ロール | 説明 |
|--------|------|
| `super_admin` | 全テナント管理 |
| `admin` | テナント内全権限 |
| `manager` | チーム日報閲覧・承認・ナッジ |
| `member` | 日報提出・ピア閲覧 |

---

## セットアップ

### 前提条件

- Node.js 20+
- Supabase プロジェクト（[supabase.com](https://supabase.com)）

### 1. リポジトリクローン

```bash
git clone https://github.com/Gru-design/STEP.git
cd STEP
npm install
```

### 2. 環境変数

```bash
cp .env.local.example .env.local
```

`.env.local` を編集し、Supabase のクレデンシャルを設定：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
CRON_SECRET=your_cron_secret   # openssl rand -hex 32 で生成
```

### 3. データベースマイグレーション

Supabase ダッシュボードの SQL Editor で、`supabase/migrations/` 内のファイルを番号順に実行：

```
00001_initial.sql
00002_report_templates.sql
00003_report_entries.sql
00004_nudge_gamification.sql
00005_goals_deals.sql
00006_plans_knowledge_digest.sql
00007_integrations.sql
00008_fix_fk_cascades.sql
```

### 4. Custom Access Token Hook を有効化

Supabase Dashboard → Authentication → Hooks → Custom Access Token で `public.custom_access_token_hook` を有効にしてください。これが無効だとRLSが正しく動作しません。

### 5. 開発サーバー起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアクセス。

---

## スクリプト

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド |
| `npm run start` | プロダクションサーバー起動 |
| `npm run lint` | ESLint実行 |
| `npm test` | ユニットテスト実行 (Vitest) |
| `npm run test:watch` | テストをwatchモードで実行 |
| `npm run typecheck` | TypeScript型チェック |

---

## ディレクトリ構造

```
src/
├── app/
│   ├── (auth)/           # 認証ページ (login, signup, forgot-password)
│   ├── (dashboard)/      # 認証後ページ
│   │   ├── dashboard/    # ダッシュボード
│   │   ├── reports/      # 日報（フィード・作成・マイ日報）
│   │   ├── plans/        # 週次計画
│   │   ├── deals/        # 案件管理（カンバン + リスト）
│   │   ├── goals/        # 目標ツリー
│   │   ├── knowledge/    # ナレッジ
│   │   ├── team/         # チーム管理・1on1
│   │   ├── weekly-digest/ # 週刊STEP
│   │   ├── badges/       # バッジカタログ
│   │   ├── profile/      # プロフィール
│   │   ├── settings/     # テナント設定・テンプレート・ユーザー管理・エクスポート
│   │   └── admin/        # スーパーアドミン
│   ├── api/
│   │   ├── v1/           # 公開REST API (reports, deals, users)
│   │   ├── health/       # ヘルスチェック
│   │   ├── search/       # グローバル検索
│   │   ├── cron/         # Vercel Cron (ナッジ, 目標, 週刊STEP, 実行率)
│   │   └── webhooks/     # Slack webhook
│   └── page.tsx          # ランディングページ
├── components/
│   ├── ui/               # shadcn/ui コンポーネント
│   ├── shared/           # DashboardShell, BottomNav, CommandPalette, NotificationBell, Skeleton
│   ├── reports/          # DynamicForm, ReportFeed, ReactionBar, MyReportsView
│   ├── deals/            # DealsKanban, DealsListView, FunnelChart
│   ├── goals/            # GoalsTreeView
│   ├── gamification/     # LevelBadge, StreakCounter, BadgeDisplay
│   └── template-builder/ # TemplateBuilder
├── lib/
│   ├── supabase/         # client, server, middleware, admin クライアント
│   ├── nudge/            # ナッジエンジン + Realtime/Slack配信
│   ├── gamification/     # XP付与, レベル計算, バッジチェック
│   ├── goals/            # 進捗計算, 乖離検知
│   ├── plans/            # 実行率計算
│   ├── digest/           # 週刊STEP生成
│   ├── validations.ts    # 全Server Action用Zodスキーマ
│   ├── audit.ts          # 監査ログ (append-only)
│   ├── rate-limit.ts     # レート制限
│   ├── api-auth.ts       # 公開API認証 (Bearer + API Key)
│   ├── webhook-outbound.ts # HMAC署名付きWebhook配信
│   ├── tenant-theme.ts   # ホワイトラベル (テーマ管理)
│   ├── url-validation.ts # SSRF対策URL検証
│   └── env.ts            # 環境変数Zodバリデーション
├── __tests__/            # テスト (Vitest)
├── types/                # TypeScript型定義
└── middleware.ts         # 認証ガード + セッション管理
```

---

## API

### 公開REST API

認証: `Authorization: Bearer <supabase_token>` または `X-API-Key: <key>`

| メソッド | エンドポイント | 説明 |
|----------|----------------|------|
| GET | `/api/v1/reports?from=&to=&limit=&offset=` | 日報一覧 |
| GET | `/api/v1/deals?status=&limit=&offset=` | 案件一覧 |
| GET | `/api/v1/users?role=` | ユーザー一覧 |
| GET | `/api/health` | ヘルスチェック |
| GET | `/api/search?q=` | グローバル検索 |

### Webhookイベント

テナント設定で webhook URL を登録すると、以下のイベントがHMAC-SHA256署名付きで配信されます：

`report.submitted` `deal.created` `deal.stage_changed` `deal.won` `deal.lost` `plan.submitted` `plan.approved` `plan.rejected` `goal.deviation` `user.invited` `user.deactivated`

---

## セキュリティ

| 対策 | 詳細 |
|------|------|
| RLS | 全テーブルにRow Level Security。テナント完全分離 |
| CSP | Content-Security-Policy (script/style/connect制限) |
| HSTS | Strict-Transport-Security (2年, preload) |
| X-Frame-Options | DENY (Clickjacking防止) |
| SSRF防止 | Webhook URLのプライベートIP/localhost拒否 |
| 入力検証 | 全Server ActionにZodスキーマバリデーション |
| APIキー | timing-safe比較 (タイミング攻撃防止) |
| レート制限 | 全APIエンドポイント (IP単位) |
| 監査ログ | 全CRUD操作をactivity_logsに記録 |
| CRON認証 | Bearer token必須 (未設定時はアクセス拒否) |

---

## テスト

```bash
npm test
```

47テスト（3ファイル）:
- `validations.test.ts` — Zodスキーマバリデーション (22テスト)
- `security.test.ts` — SSRF URL検証 + Report/Planスキーマ (14テスト)
- `tenant-theme.test.ts` — テーマ抽出・CSS injection防止 (11テスト)

---

## デプロイ

### Vercel

1. GitHubリポジトリをVercelに接続
2. 環境変数を設定（`.env.local.example` 参照）
3. `vercel.json` のcronジョブが自動設定される

### CI/CD

GitHub Actionsで以下が自動実行されます（`.github/workflows/ci.yml`）:
- TypeScript型チェック
- ESLint
- ユニットテスト

---

## ライセンス

Proprietary - All rights reserved.
