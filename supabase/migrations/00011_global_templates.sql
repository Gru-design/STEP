-- Migration: Add global templates support
-- Global templates have tenant_id = NULL and can be auto-distributed to all tenants.
-- source_template_id tracks which global template a tenant copy originated from.

-- 1. Make tenant_id nullable on report_templates (NULL = global template)
ALTER TABLE report_templates ALTER COLUMN tenant_id DROP NOT NULL;

-- 2. Add source_template_id to track the origin global template
ALTER TABLE report_templates
  ADD COLUMN source_template_id uuid REFERENCES report_templates(id) ON DELETE SET NULL;

-- 3. Index for efficient lookup of global templates
CREATE INDEX idx_report_templates_global ON report_templates (id) WHERE tenant_id IS NULL;

-- 4. Index for finding tenant copies of a global template
CREATE INDEX idx_report_templates_source ON report_templates (source_template_id) WHERE source_template_id IS NOT NULL;

-- 5. Update RLS policies to allow super_admin to manage global templates
-- Global templates (tenant_id IS NULL) are readable by all authenticated users
-- but only writable by super_admin

-- Drop existing policies if they exist, then recreate
DO $$
BEGIN
  -- Try to drop existing policies (ignore errors if they don't exist)
  BEGIN
    DROP POLICY IF EXISTS "tenant_isolation" ON report_templates;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Read: users can see their tenant's templates + global templates
CREATE POLICY "template_read_policy" ON report_templates
  FOR SELECT USING (
    tenant_id IS NULL
    OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    OR (auth.jwt() ->> 'role') = 'super_admin'
  );

-- Insert: admins for their tenant, super_admin for global
CREATE POLICY "template_insert_policy" ON report_templates
  FOR INSERT WITH CHECK (
    (tenant_id IS NOT NULL AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin'))
    OR (tenant_id IS NULL AND (auth.jwt() ->> 'role') = 'super_admin')
  );

-- Update: admins for their tenant, super_admin for global
CREATE POLICY "template_update_policy" ON report_templates
  FOR UPDATE USING (
    (tenant_id IS NOT NULL AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin'))
    OR (tenant_id IS NULL AND (auth.jwt() ->> 'role') = 'super_admin')
  );

-- Delete: admins for their tenant, super_admin for global
CREATE POLICY "template_delete_policy" ON report_templates
  FOR DELETE USING (
    (tenant_id IS NOT NULL AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin'))
    OR (tenant_id IS NULL AND (auth.jwt() ->> 'role') = 'super_admin')
  );
