-- 週次振り返り（Plan Reviews）テーブル
-- 週次計画の振り返りデータを保持。メンバーの自己評価 + マネージャーフィードバック。

CREATE TABLE plan_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES weekly_plans(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) NOT NULL,

  -- メンバーの振り返り
  self_rating INTEGER CHECK (self_rating BETWEEN 1 AND 5),
  went_well TEXT,
  to_improve TEXT,
  next_actions TEXT,

  -- マネージャーのフィードバック
  manager_id UUID REFERENCES users(id),
  manager_comment TEXT,
  manager_reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- インデックス
CREATE INDEX idx_plan_reviews_tenant ON plan_reviews(tenant_id);
CREATE INDEX idx_plan_reviews_user ON plan_reviews(user_id);
CREATE INDEX idx_plan_reviews_plan ON plan_reviews(plan_id);

-- RLSポリシー
ALTER TABLE plan_reviews ENABLE ROW LEVEL SECURITY;

-- 同一テナントのメンバーは閲覧可能
CREATE POLICY "plan_reviews_select" ON plan_reviews
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- 本人のみ振り返りを作成可能
CREATE POLICY "plan_reviews_insert" ON plan_reviews
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND user_id = auth.uid()
  );

-- 本人またはマネージャーが更新可能（マネージャーフィードバック用）
CREATE POLICY "plan_reviews_update" ON plan_reviews
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (
      user_id = auth.uid()
      OR (auth.jwt() ->> 'role') IN ('admin', 'manager', 'super_admin')
    )
  );
