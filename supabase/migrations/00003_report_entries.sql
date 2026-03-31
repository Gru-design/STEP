-- Phase 2: Report Entries & Reactions

CREATE TABLE report_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES report_templates(id),
  report_date DATE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, template_id, report_date)
);

CREATE TABLE reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES report_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('like', 'fire', 'clap', 'heart', 'eyes')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_report_entries_tenant ON report_entries(tenant_id);
CREATE INDEX idx_report_entries_user_date ON report_entries(user_id, report_date);
CREATE INDEX idx_report_entries_search ON report_entries USING GIN (search_vector);
CREATE INDEX idx_reactions_entry ON reactions(entry_id);

-- RLS
ALTER TABLE report_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- report_entries: tenant isolation for SELECT (simplified - full visibility logic would check team membership and tenant settings)
CREATE POLICY "entries_select_tenant" ON report_entries
  FOR SELECT
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- report_entries: users can INSERT their own entries
CREATE POLICY "entries_insert_own" ON report_entries
  FOR INSERT
  WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND user_id = auth.uid()
  );

-- report_entries: users can UPDATE their own entries
CREATE POLICY "entries_update_own" ON report_entries
  FOR UPDATE
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND user_id = auth.uid()
  );

-- report_entries: users can DELETE their own draft entries
CREATE POLICY "entries_delete_own" ON report_entries
  FOR DELETE
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND user_id = auth.uid()
    AND status = 'draft'
  );

-- reactions: tenant isolation through join to report_entries
CREATE POLICY "reactions_select_tenant" ON reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM report_entries
      WHERE report_entries.id = reactions.entry_id
        AND report_entries.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- reactions: any tenant user can INSERT reactions on submitted entries
CREATE POLICY "reactions_insert_tenant" ON reactions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM report_entries
      WHERE report_entries.id = reactions.entry_id
        AND report_entries.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        AND report_entries.status = 'submitted'
    )
  );

-- reactions: users can DELETE their own reactions
CREATE POLICY "reactions_delete_own" ON reactions
  FOR DELETE
  USING (user_id = auth.uid());

-- search_vector auto-update trigger
CREATE OR REPLACE FUNCTION update_report_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple', COALESCE(NEW.data::text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER report_search_update
  BEFORE INSERT OR UPDATE ON report_entries
  FOR EACH ROW EXECUTE FUNCTION update_report_search_vector();

-- updated_at trigger
CREATE TRIGGER set_report_entries_updated_at
  BEFORE UPDATE ON report_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
