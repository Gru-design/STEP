-- 機能改善リクエスト (Feature Requests) テーブル
-- 各テナントのユーザーが改善要望を投稿し、super_admin が全テナント横断で閲覧・管理する

CREATE TABLE feature_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('bug', 'feature', 'improvement', 'other')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'planned', 'in_progress', 'done', 'declined')),
  admin_note TEXT,                  -- super_admin の内部メモ
  priority INTEGER DEFAULT 0,      -- 0=未設定, 1=低, 2=中, 3=高
  voted_count INTEGER DEFAULT 1,   -- 将来の投票機能用
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_feature_requests_tenant ON feature_requests(tenant_id);
CREATE INDEX idx_feature_requests_status ON feature_requests(status);
CREATE INDEX idx_feature_requests_created ON feature_requests(created_at DESC);

ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;

-- 同一テナントのメンバーは自テナントのリクエストを閲覧可能
CREATE POLICY "feature_requests_select" ON feature_requests
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    OR (auth.jwt() ->> 'role') = 'super_admin'
  );

-- 認証ユーザーは自テナントにリクエストを投稿可能
CREATE POLICY "feature_requests_insert" ON feature_requests
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND user_id = auth.uid()
  );

-- super_admin のみ更新可能 (ステータス変更・メモ追記)
CREATE POLICY "feature_requests_update" ON feature_requests
  FOR UPDATE USING (
    (auth.jwt() ->> 'role') = 'super_admin'
  );
