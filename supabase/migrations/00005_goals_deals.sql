-- ============================================
-- Phase 4: Goals, Deals, Pipeline
-- ============================================

-- ── Goals ──

CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  parent_id UUID REFERENCES goals(id),
  level TEXT NOT NULL CHECK (level IN ('company', 'department', 'team', 'individual')),
  name TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  kpi_field_key TEXT,
  template_id UUID REFERENCES report_templates(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  owner_id UUID REFERENCES users(id),
  team_id UUID REFERENCES teams(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE goal_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  actual_value NUMERIC NOT NULL DEFAULT 0,
  progress_rate NUMERIC NOT NULL DEFAULT 0,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Pipeline & Deals ──

CREATE TABLE pipeline_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  conversion_target NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
  company TEXT NOT NULL,
  title TEXT,
  value NUMERIC,
  persona JSONB DEFAULT '{}',
  due_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'hold')),
  approval_status TEXT DEFAULT 'none' CHECK (approval_status IN ('none', 'submitted', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE deal_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  from_stage UUID REFERENCES pipeline_stages(id),
  to_stage UUID NOT NULL REFERENCES pipeline_stages(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──

CREATE INDEX idx_goals_tenant ON goals(tenant_id);
CREATE INDEX idx_goals_parent ON goals(parent_id);
CREATE INDEX idx_goals_owner ON goals(owner_id);
CREATE INDEX idx_goal_snapshots_goal ON goal_snapshots(goal_id);
CREATE INDEX idx_goal_snapshots_date ON goal_snapshots(snapshot_date);
CREATE INDEX idx_pipeline_stages_tenant ON pipeline_stages(tenant_id);
CREATE INDEX idx_deals_tenant ON deals(tenant_id);
CREATE INDEX idx_deals_user ON deals(user_id);
CREATE INDEX idx_deals_stage ON deals(stage_id);
CREATE INDEX idx_deal_history_deal ON deal_history(deal_id);

-- ── RLS ──

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_history ENABLE ROW LEVEL SECURITY;

-- goals: tenant isolation
CREATE POLICY "goals_tenant_isolation" ON goals
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- goal_snapshots: accessible if goal belongs to tenant
CREATE POLICY "goal_snapshots_tenant_isolation" ON goal_snapshots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_snapshots.goal_id
        AND goals.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- pipeline_stages: tenant isolation
CREATE POLICY "pipeline_stages_tenant_isolation" ON pipeline_stages
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- deals: tenant isolation
CREATE POLICY "deals_tenant_isolation" ON deals
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- deal_history: accessible if deal belongs to tenant
CREATE POLICY "deal_history_tenant_isolation" ON deal_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_history.deal_id
        AND deals.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- ── Triggers ──

-- updated_at trigger for deals
CREATE OR REPLACE FUNCTION update_deals_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_deals_updated_at();

-- deal_history auto-record on stage change
CREATE OR REPLACE FUNCTION log_deal_stage_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    INSERT INTO deal_history (deal_id, from_stage, to_stage)
    VALUES (NEW.id, OLD.stage_id, NEW.stage_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deal_stage_change
  AFTER UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION log_deal_stage_change();
