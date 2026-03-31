# Phase 0: 基盤構築 (W1-2)

## ゴール
Next.js + Supabase + Drizzle の基盤を構築し、認証・マルチテナント・RLS・チーム階層・プロフィール・閲覧ポリシー・デザインシステムが動作する状態にする。

## タスク一覧

### 0-1. プロジェクト初期化
```bash
npx create-next-app@latest step --typescript --tailwind --app --src-dir --use-pnpm
cd step
pnpm add @supabase/supabase-js @supabase/ssr drizzle-orm postgres zod
pnpm add -D drizzle-kit @types/node
npx shadcn@latest init
npx shadcn@latest add button card input label select dialog dropdown-menu avatar badge tabs toast sheet separator textarea
```
Google Fonts (BIZ UDPGothic, Inter, JetBrains Mono) を layout.tsx に追加。

### 0-2. 環境変数 (.env.local.example)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

### 0-3. Supabase クライアント4種
src/lib/supabase/ に client.ts, server.ts, middleware.ts, admin.ts を作成。

### 0-4. Drizzle スキーマ (Phase 0 テーブル)
src/db/schema.ts に tenants, users, teams, team_members を定義。
- tenants に `report_visibility` カラム (manager_only / team / tenant_all)
- users に `phone`, `slack_id`, `calendar_url`, `bio` カラム
- 完全な定義は docs/schema.sql 参照

### 0-5. マイグレーション + RLS + Auth連携
supabase/migrations/00001_initial.sql:
- CREATE TABLE × 4 + RLS有効化 + tenant_isolation ポリシー
- handle_new_user() trigger (auth.users → public.users)
- custom_access_token_hook (JWT に tenant_id, role を含める)

### 0-6. 認証ページ
src/app/(auth)/:
- login, signup, forgot-password, callback
- signup: テナント作成 → Auth登録 → trigger で users レコード作成

### 0-7. ミドルウェア (認証ガード)
src/middleware.ts: 未認証→/login, /admin→super_admin, /settings→admin以上

### 0-8. ダッシュボードレイアウト
src/app/(dashboard)/layout.tsx:
- サイドバー (ロール別ナビ), ヘッダー (チーム切替, ユーザーメニュー)
- モバイル: ハンバーガー + Sheet

### 0-9. チーム管理
src/app/(dashboard)/team/page.tsx:
- ツリービュー, 作成, メンバー追加/削除. admin+manager のみ。

### 0-10. プロフィールページ
src/app/(dashboard)/profile/page.tsx:
- 自分のプロフィール編集: 名前, アバター, 電話番号, Slack ID, カレンダー予約URL, 自己紹介
- カレンダーURLの説明テキスト付き

src/components/shared/ProfileCard.tsx:
- 他ユーザーのカード表示 (チーム一覧, 日報, 1on1画面で使用)
- アクションボタン: 📞電話 / 💬Slack / 📅1on1予約 / ✉️メール
- 設定されていないフィールドのボタンは非表示
- tel: / slack:// / mailto: / calendar_url へのリンク

### 0-11. テナント設定 (日報閲覧ポリシー)
src/app/(dashboard)/settings/page.tsx:
- テナント名編集
- 日報閲覧ポリシー選択: manager_only / team(デフォルト) / tenant_all
- admin のみ変更可能

### 0-12. シードデータ (supabase/seed.sql)
- テナント1件 (report_visibility: 'team')
- ユーザー5名 (admin 1, manager 1, member 3) プロフィール付き
- チーム2件, team_members アサイン

### 0-13. デザインシステム
tailwind.config.ts: navy, accent, light-bg, mid-bg カスタムカラー

## 完了条件
- [ ] pnpm dev でエラーなく起動
- [ ] signup → login → ダッシュボード表示
- [ ] サイドバーがロール別に正しく表示
- [ ] チーム作成・メンバー追加ができる
- [ ] プロフィール編集 (電話・Slack・カレンダーURL) ができる
- [ ] ProfileCard から電話・Slack・1on1予約のアクションが使える
- [ ] テナント設定で日報閲覧ポリシーを変更できる
- [ ] RLS でテナント間データ分離が正しく動作
- [ ] モバイルレスポンシブ
