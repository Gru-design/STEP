-- Phase 5: Weekly Plans, Approval Logs, Knowledge Posts, Weekly Digests

-- ── Weekly Plans ──

CREATE TABLE weekly_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  week_start DATE NOT NULL,
  template_id UUID REFERENCES report_templates(id),
  items JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  execution_rate NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

CREATE INDEX idx_weekly_plans_user_week ON weekly_plans (user_id, week_start);

ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON weekly_plans
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "weekly_plans_insert" ON weekly_plans
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "weekly_plans_update" ON weekly_plans
  FOR UPDATE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- updated_at trigger for weekly_plans
CREATE TRIGGER set_weekly_plans_updated_at
  BEFORE UPDATE ON weekly_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ── Approval Logs ──

CREATE TABLE approval_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('weekly_plan', 'deal')),
  target_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected')),
  actor_id UUID NOT NULL REFERENCES users(id),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;

-- Approval logs: actors can see their own logs, and managers/admins can see logs for their tenant
-- Since approval_logs has no tenant_id, we join through the actor
CREATE POLICY "approval_logs_select" ON approval_logs
  FOR SELECT USING (
    actor_id = auth.uid()
    OR (auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'manager')
  );

CREATE POLICY "approval_logs_insert" ON approval_logs
  FOR INSERT WITH CHECK (actor_id = auth.uid());

-- ── Knowledge Posts ──

CREATE TABLE knowledge_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_search ON knowledge_posts USING GIN (search_vector);

ALTER TABLE knowledge_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON knowledge_posts
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "knowledge_posts_insert" ON knowledge_posts
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "knowledge_posts_update" ON knowledge_posts
  FOR UPDATE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- search_vector trigger for knowledge_posts
CREATE OR REPLACE FUNCTION knowledge_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.body, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_search_vector_trigger
  BEFORE INSERT OR UPDATE ON knowledge_posts
  FOR EACH ROW
  EXECUTE FUNCTION knowledge_search_vector_update();

-- updated_at trigger for knowledge_posts
CREATE TRIGGER set_knowledge_posts_updated_at
  BEFORE UPDATE ON knowledge_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ── Weekly Digests ──

CREATE TABLE weekly_digests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  week_start DATE NOT NULL,
  rankings JSONB NOT NULL DEFAULT '{}',
  mvp JSONB NOT NULL DEFAULT '{}',
  stats JSONB NOT NULL DEFAULT '{}',
  badges_earned JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, week_start)
);

ALTER TABLE weekly_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON weekly_digests
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "weekly_digests_insert" ON weekly_digests
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
