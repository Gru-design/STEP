-- Phase 6: 外部連携 (Integrations)

-- ── Integrations table ──
CREATE TABLE integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  provider TEXT NOT NULL CHECK (provider IN ('google_calendar', 'gmail', 'slack', 'teams', 'cti')),
  credentials JSONB NOT NULL DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Activity Logs table ──
CREATE TABLE activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  source TEXT NOT NULL,
  raw_data JSONB NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──
CREATE INDEX idx_integrations_tenant ON integrations(tenant_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id, collected_at);
CREATE INDEX idx_activity_logs_tenant ON activity_logs(tenant_id);

-- ── RLS ──
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Integrations: tenant isolation (admin only for write, all tenant members can read)
CREATE POLICY "integrations_tenant_read" ON integrations
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "integrations_admin_insert" ON integrations
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
  );

CREATE POLICY "integrations_admin_update" ON integrations
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
  );

CREATE POLICY "integrations_admin_delete" ON integrations
  FOR DELETE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
  );

-- Activity Logs: tenant isolation
CREATE POLICY "activity_logs_tenant_read" ON activity_logs
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "activity_logs_tenant_insert" ON activity_logs
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Unique constraint: one integration per provider per tenant
CREATE UNIQUE INDEX idx_integrations_tenant_provider ON integrations(tenant_id, provider);
