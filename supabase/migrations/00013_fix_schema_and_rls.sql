-- ============================================================
-- Migration 00013: Fix schema issues causing runtime errors
--
-- This migration ensures all required columns, constraints,
-- and RLS policies exist, even if prior migrations were
-- partially applied.
-- ============================================================

-- ─── 1. Ensure report_templates supports global templates ───
-- (Originally in 00011, but may not have been applied)

-- Make tenant_id nullable (NULL = global template)
DO $$
BEGIN
  -- Check if tenant_id is currently NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'report_templates'
      AND column_name = 'tenant_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE report_templates ALTER COLUMN tenant_id DROP NOT NULL;
    RAISE NOTICE 'report_templates.tenant_id: NOT NULL constraint dropped';
  END IF;
END $$;

-- Add source_template_id if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'report_templates'
      AND column_name = 'source_template_id'
  ) THEN
    ALTER TABLE report_templates
      ADD COLUMN source_template_id uuid REFERENCES report_templates(id) ON DELETE SET NULL;
    RAISE NOTICE 'report_templates.source_template_id: column added';
  END IF;
END $$;

-- Global template index
CREATE INDEX IF NOT EXISTS idx_report_templates_global
  ON report_templates (id) WHERE tenant_id IS NULL;

-- Source template index
CREATE INDEX IF NOT EXISTS idx_report_templates_source
  ON report_templates (source_template_id) WHERE source_template_id IS NOT NULL;


-- ─── 2. Ensure tenants.is_active exists ───
-- (Originally in 00010)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tenants'
      AND column_name = 'is_active'
  ) THEN
    ALTER TABLE tenants
      ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    RAISE NOTICE 'tenants.is_active: column added';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tenants'
      AND column_name = 'deactivated_at'
  ) THEN
    ALTER TABLE tenants
      ADD COLUMN deactivated_at TIMESTAMPTZ;
    RAISE NOTICE 'tenants.deactivated_at: column added';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active);


-- ─── 3. Fix RLS policies on report_templates ───
-- Ensure only the correct set of policies exist

DROP POLICY IF EXISTS "tenant_isolation" ON report_templates;
DROP POLICY IF EXISTS "templates_select_tenant" ON report_templates;
DROP POLICY IF EXISTS "templates_insert_admin" ON report_templates;
DROP POLICY IF EXISTS "templates_update_admin" ON report_templates;
DROP POLICY IF EXISTS "templates_delete_admin" ON report_templates;
DROP POLICY IF EXISTS "template_read_policy" ON report_templates;
DROP POLICY IF EXISTS "template_insert_policy" ON report_templates;
DROP POLICY IF EXISTS "template_update_policy" ON report_templates;
DROP POLICY IF EXISTS "template_delete_policy" ON report_templates;

-- Read: tenant users see their templates + global templates; super_admin sees all
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


-- ─── 4. Fix template_field_options RLS for global templates ───

DROP POLICY IF EXISTS "field_options_select_tenant" ON template_field_options;
DROP POLICY IF EXISTS "field_options_insert_admin" ON template_field_options;
DROP POLICY IF EXISTS "field_options_update_admin" ON template_field_options;
DROP POLICY IF EXISTS "field_options_delete_admin" ON template_field_options;

CREATE POLICY "field_options_select_tenant" ON template_field_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM report_templates
      WHERE report_templates.id = template_field_options.template_id
        AND (
          report_templates.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          OR report_templates.tenant_id IS NULL
          OR (auth.jwt() ->> 'role') = 'super_admin'
        )
    )
  );

CREATE POLICY "field_options_insert_admin" ON template_field_options
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM report_templates
      WHERE report_templates.id = template_field_options.template_id
        AND (
          (report_templates.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin'))
          OR (report_templates.tenant_id IS NULL AND (auth.jwt() ->> 'role') = 'super_admin')
        )
    )
  );

CREATE POLICY "field_options_update_admin" ON template_field_options
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM report_templates
      WHERE report_templates.id = template_field_options.template_id
        AND (
          (report_templates.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin'))
          OR (report_templates.tenant_id IS NULL AND (auth.jwt() ->> 'role') = 'super_admin')
        )
    )
  );

CREATE POLICY "field_options_delete_admin" ON template_field_options
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM report_templates
      WHERE report_templates.id = template_field_options.template_id
        AND (
          (report_templates.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin'))
          OR (report_templates.tenant_id IS NULL AND (auth.jwt() ->> 'role') = 'super_admin')
        )
    )
  );


-- ─── 5. Fix goals RLS to support super_admin ───

DROP POLICY IF EXISTS "goals_tenant_isolation" ON goals;
CREATE POLICY "goals_tenant_isolation" ON goals
  FOR ALL USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    OR (auth.jwt() ->> 'role') = 'super_admin'
  );

DROP POLICY IF EXISTS "goal_snapshots_tenant_isolation" ON goal_snapshots;
CREATE POLICY "goal_snapshots_tenant_isolation" ON goal_snapshots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_snapshots.goal_id
        AND (
          goals.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          OR (auth.jwt() ->> 'role') = 'super_admin'
        )
    )
  );


-- ─── 6. Fix report_entries FK: add ON DELETE SET NULL for template_id ───
-- This prevents errors when templates are deleted while entries reference them

DO $$
BEGIN
  -- Check if the current FK has no ON DELETE action (RESTRICT/NO ACTION)
  IF EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'report_entries_template_id_fkey'
      AND delete_rule = 'NO ACTION'
  ) THEN
    ALTER TABLE report_entries DROP CONSTRAINT report_entries_template_id_fkey;
    ALTER TABLE report_entries ADD CONSTRAINT report_entries_template_id_fkey
      FOREIGN KEY (template_id) REFERENCES report_templates(id) ON DELETE SET NULL;
    -- Also need to allow NULL for template_id
    ALTER TABLE report_entries ALTER COLUMN template_id DROP NOT NULL;
    RAISE NOTICE 'report_entries.template_id: FK updated to ON DELETE SET NULL';
  END IF;
END $$;


-- ─── 7. Add super_admin support to report_entries RLS ───

DROP POLICY IF EXISTS "entries_select_tenant" ON report_entries;
CREATE POLICY "entries_select_tenant" ON report_entries
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    OR (auth.jwt() ->> 'role') = 'super_admin'
  );


-- ─── 8. Add super_admin support to reactions RLS ───

DROP POLICY IF EXISTS "reactions_select_tenant" ON reactions;
CREATE POLICY "reactions_select_tenant" ON reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM report_entries
      WHERE report_entries.id = reactions.entry_id
        AND (
          report_entries.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          OR (auth.jwt() ->> 'role') = 'super_admin'
        )
    )
  );


-- ─── 9. Ensure activity_logs RLS allows admin client writes ───
-- The writeAuditLog function uses SERVICE_ROLE (admin) client which bypasses RLS,
-- but add a permissive INSERT policy just in case

DROP POLICY IF EXISTS "activity_logs_service_insert" ON activity_logs;
CREATE POLICY "activity_logs_service_insert" ON activity_logs
  FOR INSERT WITH CHECK (true);


-- ─── Done ───
-- After applying this migration, verify with:
--   SELECT tablename, policyname FROM pg_policies
--   WHERE tablename IN ('report_templates', 'goals', 'report_entries', 'reactions', 'template_field_options')
--   ORDER BY tablename, policyname;
