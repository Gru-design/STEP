-- super_admin needs to SELECT users and tenants across all tenants
-- for features like feature-requests admin page that JOIN these tables.

-- Allow super_admin to read all tenants
CREATE POLICY "tenants_select_super_admin" ON tenants
  FOR SELECT
  USING ((auth.jwt() ->> 'role') = 'super_admin');

-- Allow super_admin to read all users
CREATE POLICY "users_select_super_admin" ON users
  FOR SELECT
  USING ((auth.jwt() ->> 'role') = 'super_admin');
