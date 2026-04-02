<p align="center">
  <strong style="font-size: 2rem;">STEP</strong>
</p>

<p align="center">
  <em>毎日1STEP、チームが強くなる。</em>
</p>

<p align="center">
  日報 × 目標 × 案件管理を統合し、PDCAサイクルを自然に定着させるマネジメントSaaS
</p>

---

## What is STEP?

STEPは、人材紹介・派遣・メディア企業向けに設計されたマルチテナント型マネジメントプラットフォームです。

日報提出を「面倒な義務」から「30秒で終わる習慣」に変え、マネージャーの状況把握を「1時間の確認作業」から「5分のダッシュボードチェック」に短縮します。

### 3つのペルソナ × Before/After

| ペルソナ | Before | After |
|----------|--------|-------|
| **メンバー** | 日報に20分。テンプレ選んで、日付確認して、全部埋めて... | 通知タップ→前回値プリフィル→変更点だけ修正→30秒で提出→XP +10 |
| **マネージャー** | 誰が出して誰が出してない？一人ずつ開いて確認...全員分で1時間 | ダッシュボード→未提出3名が赤表示→ワンクリック確認→5分で完了 |
| **管理者** | 月次レポートのためにCSVエクスポートして手動集計 | ダッシュボード→全社KPI自動更新→部門別比較→ドリルダウン→完了 |

---

## Features

### Core

| 機能 | 説明 |
|------|------|
| **日報管理** | テンプレートベースの日報作成。プログレスバー、Sticky提出ボタン、前回値プリフィル、下書き編集 |
| **週次計画** | 計画作成・承認ワークフロー・実行率自動算出 |
| **目標管理** | ツリー構造のOKR/KPI設定・日報データからの自動追跡・乖離アラート |
| **案件管理** | カンバン + リストビュー・ステージ遷移履歴・ファネル分析 |
| **ナレッジ** | チーム内ナレッジベース・タグ分類・全文検索 |

### Engagement & Gamification

| 機能 | 説明 |
|------|------|
| **ピアボーナス** | 毎日1P、本気の感謝を伝える。専用ページで送受信履歴を一覧。ダッシュボードに通知表示 |
| **XP & レベル** | 日報提出(+10XP)、ナレッジ投稿(+20XP)、ピアボーナス送信(+3XP)/受信(+5XP) |
| **バッジ** | 連続提出、月間目標達成、四半期MVPなど9種類。Common/Rare/Epic/Legendaryのレアリティ |
| **ストリーク** | 連続提出日数をカウント。ヘッダーに常時表示 |
| **ナッジエンジン** | ルールベースの提出リマインダー・モチベ低下検知・ソーシャルプルーフ |
| **アクティビティフィード** | サイドバーにリアルタイム活動履歴（日報提出・ピアボーナス・バッジ獲得等） |
| **チェックイン** | 専用ページで毎週月曜にパルスサーベイ・コンディション確認 |

### Management & Analytics

| 機能 | 説明 |
|------|------|
| **ロール別ダッシュボード** | メンバー/マネージャー/管理者それぞれに最適化された専用コンポーネント |
| **承認ワークフロー** | 週次計画・案件の提出→承認/差戻しフロー |
| **週次レビュー** | メンバー自己評価(1-5段階) + マネージャーフィードバック |
| **週刊STEP** | テナント週次ダイジェスト自動生成（ランキング・MVP・バッジ獲得者） |
| **1on1管理** | マネージャー向けアジェンダ・コンディション推移チャート |
| **データエクスポート** | ユーザー・日報・案件・目標のCSVエクスポート |
| **管理者削除機能** | テナント管理者による日報・週次計画の削除（監査ログ付き） |

### Platform

| 機能 | 説明 |
|------|------|
| **マルチテナント** | 全テーブルRLSによるテナント分離 |
| **公開REST API** | Bearer / API Key認証 |
| **Webhook** | HMAC-SHA256署名付きイベント通知 |
| **PWA** | モバイルホーム画面追加・Service Worker |
| **ホワイトラベル** | テナント別カラー・ロゴ・アプリ名カスタマイズ |
| **コマンドパレット** | `Cmd+K` でグローバル検索・ページ遷移 |
| **オンボーディング** | テナント初回セットアップウィザード（テンプレート選択→チーム作成→招待） |
| **グローバルテンプレート** | Super Admin が作成し全テナントに自動配信。テナント作成時に自動適用 |
| **パイプライン設定** | 案件ステージをテナントごとにカスタマイズ。プリセット8段階を初期搭載 |
| **機能リクエスト** | ユーザーからの要望収集・Super Admin での一元管理 |

---

## Tech Stack

| レイヤー | 技術 |
|----------|------|
| Framework | Next.js 15 (App Router) + TypeScript (strict) |
| Database | Supabase (PostgreSQL) + Row Level Security |
| Auth | Supabase Auth (Email/Password + Google OAuth) |
| ORM | Drizzle ORM |
| UI | Tailwind CSS v4 + shadcn/ui (Radix UI) |
| Charts | Recharts (lazy-loaded via next/dynamic) |
| DnD | @dnd-kit |
| Testing | Vitest + React Testing Library |
| CI/CD | GitHub Actions |
| Hosting | Vercel |

---

## Architecture

```
                    ┌─────────────┐
                    │   Vercel    │
                    │  (Next.js)  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
     ┌────────▼──┐  ┌──────▼──────┐  ┌──▼──────────┐
     │  App      │  │  API Routes │  │  Cron Jobs  │
     │  Router   │  │  /api/v1/*  │  │  /api/cron  │
     │  (SSR)    │  │  (REST)     │  │  (Vercel)   │
     └────────┬──┘  └──────┬──────┘  └──┬──────────┘
              │            │            │
              └────────────┼────────────┘
                           │
                  ┌────────▼────────┐
                  │    Supabase     │
                  │  ┌───────────┐  │
                  │  │ PostgreSQL│  │
                  │  │   + RLS   │  │
                  │  └───────────┘  │
                  │  ┌───────────┐  │
                  │  │   Auth    │  │
                  │  └───────────┘  │
                  │  ┌───────────┐  │
                  │  │ Realtime  │  │
                  │  └───────────┘  │
                  └─────────────────┘
```

### Roles & Permissions

| ロール | 値 | 説明 |
|--------|---|------|
| Super Admin | `super_admin` | 全テナント管理（STEP運営） |
| Admin | `admin` | テナント内全権限 |
| Manager | `manager` | チーム日報閲覧・承認・ナッジ・1on1 |
| Member | `member` | 日報提出・ピア閲覧・ナレッジ投稿 |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase プロジェクト（[supabase.com](https://supabase.com)）

### Setup

```bash
# 1. Clone & install
git clone https://github.com/Gru-design/STEP.git
cd STEP
npm install

# 2. Environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

**Required environment variables:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
CRON_SECRET=your_cron_secret   # openssl rand -hex 32
```

```bash
# 3. Run database migrations
# Execute all files in supabase/migrations/ in order via Supabase SQL Editor

# 4. Enable Custom Access Token Hook
# Supabase Dashboard → Authentication → Hooks → Custom Access Token
# → Enable public.custom_access_token_hook

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run typecheck` | TypeScript type check |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, Signup, Forgot Password
│   ├── (dashboard)/         # Authenticated pages
│   │   ├── dashboard/       # Role-based dashboard
│   │   ├── reports/         # Daily reports (feed, new, my, detail, edit)
│   │   ├── plans/           # Weekly plans + approval + review
│   │   ├── deals/           # Deal management (kanban + list)
│   │   ├── goals/           # Goal tree
│   │   ├── knowledge/       # Knowledge base
│   │   ├── checkins/        # Check-in / pulse survey
│   │   ├── peer-bonus/      # Peer bonus history
│   │   ├── team/            # Team management + 1on1
│   │   ├── weekly-digest/   # Weekly STEP magazine
│   │   ├── badges/          # Badge catalog
│   │   ├── profile/         # User profile
│   │   ├── feature-requests/# Feature request board
│   │   ├── onboarding/      # Tenant setup wizard
│   │   ├── settings/        # Tenant settings, templates, users, pipeline, export
│   │   └── admin/           # Super admin panel + global templates
│   └── api/
│       ├── v1/              # Public REST API
│       ├── cron/            # Vercel Cron jobs
│       └── webhooks/        # Inbound webhooks
├── components/
│   ├── ui/                  # shadcn/ui primitives
│   ├── shared/              # DashboardShell, BottomNav, CommandPalette
│   ├── reports/             # DynamicForm, ReportFeed, ReactionBar, PeerBonusSelector
│   ├── deals/               # DealsKanban, FunnelChart
│   ├── goals/               # GoalsTreeView
│   ├── gamification/        # LevelBadge, StreakCounter, BadgeDisplay, XPToast
│   └── template-builder/    # Drag-and-drop template editor
├── lib/
│   ├── supabase/            # Client instances (browser, server, admin)
│   ├── gamification/        # XP, levels, badge checker
│   ├── nudge/               # Nudge engine + delivery
│   ├── goals/               # Progress calculation, deviation detection
│   └── ...                  # Audit, webhooks, rate-limit, etc.
└── types/                   # TypeScript type definitions
```

---

## API Reference

### Public REST API

Authentication: `Authorization: Bearer <token>` or `X-API-Key: <key>`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/reports?from=&to=&limit=&offset=` | List reports |
| GET | `/api/v1/deals?status=&limit=&offset=` | List deals |
| GET | `/api/v1/users?role=` | List users |
| GET | `/api/health` | Health check |
| GET | `/api/search?q=` | Global search |

### Webhook Events

Register a webhook URL in tenant settings. Events are delivered with HMAC-SHA256 signatures.

```
report.submitted    deal.created         deal.stage_changed
deal.won            deal.lost            plan.submitted
plan.approved       plan.rejected        goal.deviation
user.invited        user.deactivated
```

---

## Design System

| Element | Specification |
|---------|---------------|
| **Color** | Split-Complementary: Teal primary (`#0D9488`) + Orange accent (`#F97316`) |
| **Neutrals** | Warm Stone palette (stone-100 ~ stone-900) |
| **Typography** | BIZ UDPGothic (JP) + Inter (EN) + JetBrains Mono (numbers) |
| **Cards** | `rounded-xl` + `border-border` + `shadow-sm` |
| **Buttons** | `rounded-xl` + `h-11` (44px touch target) |
| **Responsive** | Mobile-first. sm:640 / md:768 / lg:1024 |
| **Navigation** | Desktop sidebar + Mobile bottom nav with FAB |

---

## Performance

| 施策 | 効果 |
|------|------|
| **クエリ並列化** | Dashboard Layout/Page の DB クエリを `Promise.all` で並列実行。直列 40+ → 2 段バッチ |
| **SELECT 列制限** | `SELECT *` を全廃。必要カラムのみ取得で転送量削減 |
| **複合インデックス** | `report_entries`, `goals`, `nudges` 等 10 本のインデックスで頻出クエリを高速化 |
| **Cron N+1 解消** | 全 Cron ジョブ（ナッジ・ダイジェスト等）の N+1 クエリを修正。Supabase クライアントの一括引き回し |
| **RLS 非正規化** | `team_members` に `tenant_id` を非正規化し、RLS ポリシーの JOIN 負荷を排除 |
| **Recharts lazy load** | `next/dynamic` でチャートライブラリを遅延読み込み（初期バンドル -100KB） |
| **フォント最適化** | `preconnect` + `display=swap` で Inter / BIZ UDPGothic / JetBrains Mono を最適ロード |
| **JWT claim 活用** | Server Actions で `tenant_id` を JWT から取得し DB クエリ 1 回削減/アクション |
| **React cache()** | テナント設定・テンプレートのリクエスト内重複クエリ排除 |
| **unstable_cache** | テンプレート・設定・ステージ・バッジ等の低頻度データをサーバーキャッシュ |
| **Singleton Admin** | Supabase Admin クライアントをシングルトン化し接続プール最適化 |

---

## Security

| Layer | Measure |
|-------|---------|
| Transport | HSTS (2yr, preload) + CSP |
| Auth | Supabase Auth + Custom Access Token Hook |
| Authorization | RLS on all tables + Server Action role checks |
| Tenant Isolation | `tenant_id` always from authenticated session, never client input |
| Input Validation | Zod schemas on all Server Actions |
| SSRF Prevention | Private IP / localhost rejection for webhook URLs |
| API Auth | `crypto.timingSafeEqual()` for timing-safe comparison |
| Rate Limiting | IP-based on all API endpoints |
| Audit | Append-only `activity_logs` table |
| Error Handling | All Server Actions wrapped in try/catch. No DB errors leak to client |

---

## Pricing

| Plan | Price/user/mo | Highlights |
|------|--------------|------------|
| Free | ¥0 | Daily reports, check-ins, team management (up to 5 users) |
| Starter | ¥980 | Template builder, nudges, gamification |
| Professional | ¥1,980 | Goals, deals, weekly plans, approval, knowledge, 1on1 |
| Enterprise | Contact us | SSO, audit logs, API, all features |

---

## Database Migrations

Migrations are in `supabase/migrations/` and should be executed in order:

```
00001_initial.sql                → Core tables (tenants, users, teams)
00002_report_templates.sql       → Report templates
00003_report_entries.sql         → Report entries + reactions
00004_nudge_gamification.sql     → Nudges, badges, XP, levels
00005_goals_deals.sql            → Goals, deals, pipeline stages
00006_plans_knowledge_digest.sql → Weekly plans, knowledge, digests
00007_integrations.sql           → API keys, webhooks, integrations
00008_fix_fk_cascades.sql        → FK cascade fixes
00009_dashboard_performance_indexes.sql → Dashboard performance indexes
00010_add_tenant_is_active.sql   → Tenant activation flag
00011_global_templates.sql       → Global template support
00012_fix_template_rls_policies.sql → Template RLS fixes
00013_fix_schema_and_rls.sql     → Schema & RLS refinements
00014_missing_rls_policies.sql   → Missing RLS policies
00015_peer_bonuses.sql           → Peer bonus system
00016_plan_reviews.sql           → Plan review system
00017_avatars_storage.sql        → Avatar storage
00018_feature_requests.sql       → Feature request board
00019_onboarding.sql             → Tenant onboarding wizard
00020_report_comments.sql        → Report comment threads
00021_performance_indexes.sql    → Compound indexes for query optimization
00022_team_members_tenant_id.sql → team_members tenant_id denormalization for RLS
00023_super_admin_cross_tenant_select.sql → super_admin cross-tenant SELECT on users/tenants
00024_admin_delete_policies.sql           → Admin deletion policies for reports/plans
```

---

## Testing

```bash
npm test
```

47 tests across 3 test files:
- **validations.test.ts** — Zod schema validation (22 tests)
- **security.test.ts** — SSRF URL validation + report/plan schemas (14 tests)
- **tenant-theme.test.ts** — Theme extraction + CSS injection prevention (11 tests)

---

## Deployment

### Vercel

1. Connect GitHub repository to Vercel
2. Set environment variables (see `.env.local.example`)
3. Cron jobs auto-configured via `vercel.json`

### CI/CD

GitHub Actions (`.github/workflows/ci.yml`):
- TypeScript type check
- ESLint
- Unit tests

---

## License

Proprietary - All rights reserved.
