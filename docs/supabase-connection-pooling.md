# Supabase Connection Pooling 設定ガイド

## 概要

STEP は Supabase Pro プランの Supavisor (connection pooler) を活用し、
PostgreSQL への接続数を最適化する。

## 接続の種類

| 用途 | 環境変数 | ポート | 説明 |
|------|---------|--------|------|
| マイグレーション | `DATABASE_URL` | 5432 | 直接接続。DDL 実行に必要 |
| アプリケーションクエリ | `DATABASE_POOLED_URL` | 6543 | Supavisor 経由。本番推奨 |
| Supabase JS Client | - | HTTPS | REST API 経由。pooling 不要 |

## Supabase JS Client について

`createAdminClient()` および `createClient()` は Supabase JS SDK を使用し、
PostgREST (HTTPS) 経由で通信する。これは PostgreSQL の直接接続ではないため、
**connection pool の設定は直接影響しない**。

ただし PostgREST 自体が内部で PostgreSQL connection pool を持つため、
Supabase Dashboard 側で適切な pool size を設定することが重要。

## Supavisor 設定手順 (Supabase Dashboard)

### 1. Connection Pooling を有効化

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. プロジェクトを選択
3. **Settings > Database** に移動
4. **Connection Pooling** セクションを確認
5. **Pool Mode** を `Transaction` に設定 (推奨)

### 2. Pool Size の推奨値

Supabase Pro プランのデフォルト:

| 設定 | 推奨値 | 説明 |
|------|--------|------|
| Pool Mode | Transaction | ステートメントごとに接続を返却。Serverless に最適 |
| Pool Size | 15 | Pro プランのデフォルト。通常これで十分 |
| Max Client Connections | 200 | Supavisor が受け付けるクライアント接続上限 |

> **注意**: Vercel Serverless Functions は関数ごとにプロセスが分離されるため、
> 直接接続だと接続数が急増する。Supavisor を経由することでこの問題を回避できる。

### 3. Pooler 接続文字列の取得

1. **Settings > Database** の **Connection string** セクション
2. **Mode: Session** のドロップダウンを **Transaction** に変更
3. **URI** タブから接続文字列をコピー
4. `.env.local` の `DATABASE_POOLED_URL` に設定

```
DATABASE_POOLED_URL=postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

### 4. Pool Mode の選択基準

| Mode | 用途 | 制約 |
|------|------|------|
| **Transaction** (推奨) | Serverless、短命クエリ | PREPARE/LISTEN/NOTIFY 使用不可 |
| Session | 長時間接続が必要な場合 | 接続を占有するため pool 効率が低い |

STEP は Vercel Serverless + Next.js Server Actions を使うため、
**Transaction mode** が最適。

## Drizzle ORM を使う場合

現在 STEP は Drizzle をマイグレーション管理にのみ使用しているが、
将来的にランタイムクエリで Drizzle を使う場合は以下のように設定する:

```typescript
// src/db/index.ts (例)
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// 本番ではプール接続、マイグレーションでは直接接続を使い分け
const connectionString =
  process.env.DATABASE_POOLED_URL ?? process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  // Supavisor Transaction mode では prepare を無効にする必要がある
  prepare: false,
});

export const db = drizzle(client);
```

> **重要**: Transaction mode の Supavisor では `prepare: false` が必須。
> Prepared statements は session をまたいで保持できないため。

## admin.ts のシングルトン化

`createAdminClient()` はモジュールレベルでシングルトン化済み。
Node.js プロセス内で同一インスタンスを再利用するため、
cron ジョブ等で繰り返し呼び出しても新規接続は発生しない。

```typescript
// 呼び出し側は変更不要
const supabase = createAdminClient(); // 2回目以降はキャッシュを返す
```

## server.ts について

`createClient()` (server.ts) はリクエストごとの cookie に依存するため、
シングルトン化は不適切。現状の実装を維持する。

## チェックリスト

- [ ] Supabase Dashboard で Connection Pooling が有効であることを確認
- [ ] Pool Mode が `Transaction` に設定されていることを確認
- [ ] `.env.local` に `DATABASE_POOLED_URL` を設定 (Drizzle ランタイム使用時)
- [ ] `DATABASE_URL` (port 5432) はマイグレーション専用として維持
- [ ] Vercel の Environment Variables にも同様に設定
