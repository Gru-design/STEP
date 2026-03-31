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
