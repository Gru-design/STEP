-- ============================================================
-- Migration: Add tenant_id to team_members for RLS performance
--
-- Problem: team_members RLS policies use EXISTS subqueries
-- joining to teams table, causing N subqueries for N rows.
--
-- Solution: Denormalize tenant_id onto team_members, use
-- a trigger to keep it in sync, and simplify RLS policies
-- to direct tenant_id comparison.
-- ============================================================

-- =========================
-- 1. Add tenant_id column
-- =========================

ALTER TABLE team_members
  ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- =========================
-- 2. Backfill existing data
-- =========================

UPDATE team_members
SET tenant_id = teams.tenant_id
FROM teams
WHERE team_members.team_id = teams.id;

-- Now enforce NOT NULL
ALTER TABLE team_members
  ALTER COLUMN tenant_id SET NOT NULL;

-- =========================
-- 3. Index for RLS performance
-- =========================

CREATE INDEX idx_team_members_tenant ON team_members(tenant_id);

-- =========================
-- 4. Trigger: auto-set and validate tenant_id
-- =========================

CREATE OR REPLACE FUNCTION public.set_team_member_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_tenant_id UUID;
BEGIN
  -- Look up the team's tenant_id
  SELECT tenant_id INTO v_team_tenant_id
  FROM teams
  WHERE id = NEW.team_id;

  IF v_team_tenant_id IS NULL THEN
    RAISE EXCEPTION 'team_id % does not exist', NEW.team_id;
  END IF;

  -- On INSERT: always set from the team's tenant_id
  IF TG_OP = 'INSERT' THEN
    NEW.tenant_id := v_team_tenant_id;
  END IF;

  -- On UPDATE: if team_id changed, update tenant_id to match
  IF TG_OP = 'UPDATE' AND NEW.team_id IS DISTINCT FROM OLD.team_id THEN
    NEW.tenant_id := v_team_tenant_id;
  END IF;

  -- Prevent tenant_id from being manually set to a wrong value
  IF NEW.tenant_id IS DISTINCT FROM v_team_tenant_id THEN
    RAISE EXCEPTION 'tenant_id mismatch: team % belongs to tenant %, not %',
      NEW.team_id, v_team_tenant_id, NEW.tenant_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_team_members_set_tenant_id
  BEFORE INSERT OR UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.set_team_member_tenant_id();

-- =========================
-- 5. Drop old RLS policies
-- =========================

DROP POLICY IF EXISTS "team_members_select_tenant" ON team_members;
DROP POLICY IF EXISTS "team_members_insert_admin" ON team_members;
DROP POLICY IF EXISTS "team_members_update_admin" ON team_members;
DROP POLICY IF EXISTS "team_members_delete_admin" ON team_members;

-- =========================
-- 6. Create new RLS policies (direct tenant_id comparison)
-- =========================

-- SELECT: same tenant can read
CREATE POLICY "team_members_select_tenant" ON team_members
  FOR SELECT
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- INSERT: admin/super_admin/manager within same tenant
CREATE POLICY "team_members_insert_admin" ON team_members
  FOR INSERT
  WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'manager')
  );

-- UPDATE: admin/super_admin/manager within same tenant
CREATE POLICY "team_members_update_admin" ON team_members
  FOR UPDATE
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'manager')
  );

-- DELETE: admin/super_admin/manager within same tenant
CREATE POLICY "team_members_delete_admin" ON team_members
  FOR DELETE
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'manager')
  );
