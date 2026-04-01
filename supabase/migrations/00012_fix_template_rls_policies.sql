-- Migration: Fix conflicting RLS policies on report_templates
--
-- The 00011 migration added new policies but failed to drop the old ones
-- from 00002, causing duplicate SELECT/INSERT/UPDATE/DELETE policies.
-- When multiple policies exist for the same operation, PostgreSQL requires
-- ALL of them to pass (AND logic), which breaks queries on templates
-- with tenant_id IS NULL (global templates) and JOIN queries.

-- 1. Drop the old policies from 00002_report_templates.sql
DROP POLICY IF EXISTS "templates_select_tenant" ON report_templates;
DROP POLICY IF EXISTS "templates_insert_admin" ON report_templates;
DROP POLICY IF EXISTS "templates_update_admin" ON report_templates;
DROP POLICY IF EXISTS "templates_delete_admin" ON report_templates;

-- 2. Drop the new policies from 00011 (to recreate them cleanly)
DROP POLICY IF EXISTS "template_read_policy" ON report_templates;
DROP POLICY IF EXISTS "template_insert_policy" ON report_templates;
DROP POLICY IF EXISTS "template_update_policy" ON report_templates;
DROP POLICY IF EXISTS "template_delete_policy" ON report_templates;

-- 3. Recreate correct policies that support both tenant-specific and global templates

-- Read: users can see their tenant's templates (published or if admin) + global templates
CREATE POLICY "template_read_policy" ON report_templates
  FOR SELECT USING (
    (
      tenant_id IS NOT NULL
      AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
      AND (
        is_published = true
        OR (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
      )
    )
    OR tenant_id IS NULL
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
