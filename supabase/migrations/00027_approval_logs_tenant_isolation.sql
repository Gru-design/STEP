-- =============================================================================
-- 00027: approval_logs テナント分離修正
--
-- 問題: approval_logs テーブルに tenant_id カラムがなく、RLSポリシーが
--       不完全なため、他テナントの承認ログが閲覧可能だった。
--
-- 修正内容:
--   1. tenant_id カラムを追加
--   2. 既存データを weekly_plans / deals から tenant_id をバックフィル
--   3. NOT NULL 制約を追加
--   4. 壊れた RLS ポリシーをすべて削除し、正しいポリシーを再作成
--   5. action CHECK 制約を更新 ('reopened' を追加)
-- =============================================================================

-- 1. tenant_id カラム追加 (nullable initially for backfill)
ALTER TABLE approval_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 2. 既存データのバックフィル: weekly_plans から tenant_id を取得
UPDATE approval_logs al
SET tenant_id = wp.tenant_id
FROM weekly_plans wp
WHERE al.target_type = 'weekly_plan'
  AND al.target_id = wp.id
  AND al.tenant_id IS NULL;

-- 既存データのバックフィル: deals から tenant_id を取得
UPDATE approval_logs al
SET tenant_id = d.tenant_id
FROM deals d
WHERE al.target_type = 'deal'
  AND al.target_id = d.id
  AND al.tenant_id IS NULL;

-- バックフィルできなかった孤立レコード: actor_id から users 経由で取得
UPDATE approval_logs al
SET tenant_id = u.tenant_id
FROM users u
WHERE al.actor_id = u.id
  AND al.tenant_id IS NULL;

-- 3. NOT NULL 制約を追加
ALTER TABLE approval_logs ALTER COLUMN tenant_id SET NOT NULL;

-- 4. tenants テーブルへの外部キー追加
ALTER TABLE approval_logs
  ADD CONSTRAINT approval_logs_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- 5. パフォーマンス用インデックス追加
CREATE INDEX IF NOT EXISTS idx_approval_logs_tenant_id ON approval_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approval_logs_tenant_target ON approval_logs(tenant_id, target_type, target_id);

-- 6. action CHECK 制約を更新 ('reopened' を追加)
ALTER TABLE approval_logs DROP CONSTRAINT IF EXISTS approval_logs_action_check;
ALTER TABLE approval_logs ADD CONSTRAINT approval_logs_action_check
  CHECK (action IN ('submitted', 'approved', 'rejected', 'reopened'));

-- =============================================================================
-- 7. 壊れた RLS ポリシーをすべて削除
-- =============================================================================

-- Migration 00006 で作成されたポリシー (テナント分離なし)
DROP POLICY IF EXISTS "approval_logs_select" ON approval_logs;
DROP POLICY IF EXISTS "approval_logs_insert" ON approval_logs;

-- Migration 00014 で作成されたポリシー (JOINベースの不完全な分離)
DROP POLICY IF EXISTS "approval_logs_select_tenant" ON approval_logs;
DROP POLICY IF EXISTS "approval_logs_insert_authenticated" ON approval_logs;

-- =============================================================================
-- 8. 正しい RLS ポリシーを作成 (tenant_id ベース)
-- =============================================================================

-- SELECT: 同一テナントのメンバーのみ閲覧可能。super_admin は全テナント閲覧可能。
CREATE POLICY "approval_logs_tenant_select" ON approval_logs
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    OR (auth.jwt() ->> 'role') = 'super_admin'
  );

-- INSERT: 同一テナントの認証済みユーザーのみ挿入可能。actor_id は自分自身であること。
CREATE POLICY "approval_logs_tenant_insert" ON approval_logs
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND actor_id = auth.uid()
  );

-- UPDATE: 承認ログは不変レコードのため更新不可
-- (ポリシーなし = 更新拒否)

-- DELETE: 承認ログは不変レコードのため削除不可
-- (ポリシーなし = 削除拒否)
