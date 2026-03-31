-- report_templates table
CREATE TABLE report_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'plan', 'checkin')),
  target_roles TEXT[] DEFAULT '{"member"}',
  schema JSONB NOT NULL DEFAULT '{"sections":[]}',
  visibility_override TEXT CHECK (visibility_override IN ('manager_only', 'team', 'tenant_all')),
  is_system BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- template_field_options table
CREATE TABLE template_field_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE NOT NULL,
  field_key TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_report_templates_tenant ON report_templates(tenant_id);
CREATE INDEX idx_template_field_options_template ON template_field_options(template_id);

-- RLS
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_field_options ENABLE ROW LEVEL SECURITY;

-- report_templates: all tenant users can SELECT published templates
CREATE POLICY "templates_select_tenant" ON report_templates
  FOR SELECT
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (
      is_published = true
      OR (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
    )
  );

-- report_templates: admin only INSERT
CREATE POLICY "templates_insert_admin" ON report_templates
  FOR INSERT
  WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
  );

-- report_templates: admin only UPDATE
CREATE POLICY "templates_update_admin" ON report_templates
  FOR UPDATE
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
  );

-- report_templates: admin only DELETE
CREATE POLICY "templates_delete_admin" ON report_templates
  FOR DELETE
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
  );

-- template_field_options: tenant isolation through join
CREATE POLICY "field_options_select_tenant" ON template_field_options
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM report_templates
      WHERE report_templates.id = template_field_options.template_id
        AND report_templates.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY "field_options_insert_admin" ON template_field_options
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM report_templates
      WHERE report_templates.id = template_field_options.template_id
        AND report_templates.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "field_options_update_admin" ON template_field_options
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM report_templates
      WHERE report_templates.id = template_field_options.template_id
        AND report_templates.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "field_options_delete_admin" ON template_field_options
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM report_templates
      WHERE report_templates.id = template_field_options.template_id
        AND report_templates.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
    )
  );

-- updated_at trigger for report_templates
CREATE TRIGGER set_report_templates_updated_at
  BEFORE UPDATE ON report_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
