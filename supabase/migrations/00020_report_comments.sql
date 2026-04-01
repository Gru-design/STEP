-- コメント・スレッド機能
-- 日報へのスレッド型コメント。リアクションとは独立。

CREATE TABLE report_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  entry_id UUID REFERENCES report_entries(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES report_comments(id) ON DELETE CASCADE,  -- 返信の場合
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_report_comments_entry ON report_comments(entry_id, created_at);
CREATE INDEX idx_report_comments_parent ON report_comments(parent_id);
CREATE INDEX idx_report_comments_user ON report_comments(user_id);

ALTER TABLE report_comments ENABLE ROW LEVEL SECURITY;

-- 同一テナントのメンバーは閲覧可能
CREATE POLICY "report_comments_select" ON report_comments
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    OR (auth.jwt() ->> 'role') = 'super_admin'
  );

-- 認証ユーザーは自テナントの日報にコメント可能
CREATE POLICY "report_comments_insert" ON report_comments
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND user_id = auth.uid()
  );

-- 本人のみ編集可能
CREATE POLICY "report_comments_update" ON report_comments
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- 本人またはadmin/managerが削除可能
CREATE POLICY "report_comments_delete" ON report_comments
  FOR DELETE USING (
    user_id = auth.uid()
    OR (
      tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
      AND (auth.jwt() ->> 'role') IN ('admin', 'manager', 'super_admin')
    )
  );
