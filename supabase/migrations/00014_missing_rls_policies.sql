-- Migration: 00014_missing_rls_policies.sql
-- Description: Add RLS policies for tables that have RLS enabled but no policies defined:
--   badges, user_levels, user_badges, approval_logs, weekly_digests

-- =============================================================================
-- 1. badges - App-wide definitions, readable by all authenticated users
-- =============================================================================

CREATE POLICY "badges_select_authenticated" ON badges
  FOR SELECT TO authenticated USING (true);

-- =============================================================================
-- 2. user_levels - Users can read/update their own level, admins can read all in tenant
-- =============================================================================

CREATE POLICY "user_levels_select_own" ON user_levels
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_levels_insert" ON user_levels
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_levels_update_own" ON user_levels
  FOR UPDATE USING (user_id = auth.uid());

-- =============================================================================
-- 3. user_badges - Users can read their own badges
-- =============================================================================

CREATE POLICY "user_badges_select_own" ON user_badges
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_badges_insert" ON user_badges
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- 4. approval_logs - Tenant-isolated read access via related weekly_plans or deals
-- =============================================================================

CREATE POLICY "approval_logs_select_tenant" ON approval_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM weekly_plans wp
      WHERE wp.id = approval_logs.target_id
        AND wp.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
    OR EXISTS (
      SELECT 1 FROM deals d
      WHERE d.id = approval_logs.target_id
        AND d.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY "approval_logs_insert_authenticated" ON approval_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================================================
-- 5. weekly_digests - Tenant isolation
-- =============================================================================

CREATE POLICY "weekly_digests_select_tenant" ON weekly_digests
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
