# Phase 1: テンプレートビルダー (W3-5)

## ゴール
管理者がノーコードで日報・週報・週次計画・チェックインのテンプレートを作成・カスタマイズ・公開できる状態にする。

## 前提
Phase 0 が完了していること。

## タスク一覧

### 1-1. テーブル追加

```sql
CREATE TABLE report_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'plan', 'checkin')),
  target_roles TEXT[] DEFAULT '{"member"}',
  schema JSONB NOT NULL DEFAULT '{"sections":[]}',
  visibility_override TEXT CHECK (visibility_override IN ('manager_only', 'team', 'tenant_all')),
  is_system BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE template_field_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE NOT NULL,
  field_key TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

RLS: tenant_isolation + admin のみ作成・編集、member は公開済みテンプレートの閲覧のみ。

### 1-2. テンプレートビルダーUI

`src/components/template-builder/` に以下を作成:

**TemplateBuilder.tsx** (メインコンポーネント, "use client")
- 左パネル: フィールドタイプパレット (11種をアイコン付きで表示)
- 中央: ビルダーエリア (D&D でフィールドを配置)
- 右パネル: 選択中フィールドのプロパティ設定

D&D は `@dnd-kit/core` + `@dnd-kit/sortable` を使用:
```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**FieldPalette.tsx**
- 11フィールドタイプをカード表示
- ドラッグ開始でビルダーエリアに追加可能

**FieldRenderer.tsx**
- フィールドタイプに応じた表示を切り替え
- ビルダーモード (設定UI) とプレビューモード (実際の入力UI) の2モード

**FieldProperties.tsx**
- 選択中フィールドのプロパティ編集パネル
- label, required, placeholder, unit, min, max, options を編集
- バリデーション設定

**SectionBlock.tsx**
- セクション区切りコンポーネント
- セクション名の編集、フィールドのグルーピング

**RepeaterField.tsx**
- リピーターフィールド: 子フィールドを持てる
- 追加/削除ボタン付き

### 1-3. テンプレート管理ページ

`src/app/(dashboard)/settings/templates/page.tsx`:
- テンプレート一覧 (種別でフィルタ: 日報/週報/計画/チェックイン)
- 新規作成ボタン → ビルダー画面
- プリセットからコピー → ビルダー画面
- 公開/非公開トグル
- 閲覧ポリシーの設定 (テンプレート単位の上書き)
- 編集/削除

`src/app/(dashboard)/settings/templates/[id]/page.tsx`:
- テンプレートビルダー表示
- 保存 (下書き) / 公開ボタン
- プレビュータブ (実際の入力フォームの見え方)

### 1-4. テンプレートプリセット (シードデータ)

以下のシステムテンプレートを `supabase/seed.sql` に追加:

**RA コンサルタント向け日報**:
- セクション「活動実績」
  - 新規アプローチ件数 (number, 単位: 件)
  - 商談記録 (repeater: 企業名 text + ステータス select + メモ textarea)
  - 求人ヒアリング件数 (number)
  - 推薦数 (number)
- セクション「振り返り」
  - 所感・気づき (textarea)
  - 明日の予定 (textarea)
  - モチベーション (rating, 1-5)

**CA キャリアアドバイザー向け日報**:
- セクション「面談実績」
  - 新規面談数 (number)
  - 面談記録 (repeater: 求職者名 text + フェーズ select + メモ textarea)
  - 書類選考通過 / 面接設定 / 内定数 (number x3)
- セクション「振り返り」
  - 所感・気づき (textarea)
  - 明日の予定 (textarea)
  - モチベーション (rating, 1-5)

**チェックインテンプレート**:
- 週末どうだった？ (rating, 1-5 + textarea)
- チームにおすすめしたいこと (textarea, 任意)
- 今週の意気込み (textarea)

**週次計画テンプレート**:
- 今週の重点項目 (textarea)
- アプローチ予定リスト (repeater: 企業名 + アクション + 期日)
- フォロー案件リスト (repeater: 案件名 + ネクストアクション + 期日)

### 1-5. Server Actions

`src/app/(dashboard)/settings/templates/actions.ts`:
- `createTemplate(data)` - テンプレート作成
- `updateTemplate(id, data)` - テンプレート更新
- `deleteTemplate(id)` - テンプレート削除
- `publishTemplate(id)` - 公開/非公開切り替え
- `duplicateTemplate(id)` - テンプレートをコピー

### 1-6. テンプレートのバリデーション

`src/lib/template-validation.ts`:
- schema の整合性チェック (フィールドキーの重複、必須プロパティ)
- Zod スキーマで JSONB のバリデーション

## 完了条件

- [ ] 管理者がD&Dでテンプレートを作成できる
- [ ] 11フィールドタイプが全て動作する
- [ ] リピーターフィールドが正しく動作する
- [ ] プレビューで実際の入力フォームが確認できる
- [ ] プリセットテンプレートからコピーして編集できる
- [ ] テンプレートの公開/非公開が切り替えられる
- [ ] テンプレート単位の閲覧ポリシー上書きが設定できる
- [ ] member ロールからはテンプレート編集画面にアクセスできない
