-- Admin/Super Admin can DELETE report_entries within their tenant
CREATE POLICY "entries_delete_admin" ON report_entries
  FOR DELETE
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
  );

-- Admin/Super Admin can DELETE weekly_plans within their tenant
CREATE POLICY "plans_delete_admin" ON weekly_plans
  FOR DELETE
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
  );

-- Allow users to DELETE their own draft weekly_plans
CREATE POLICY "plans_delete_own_draft" ON weekly_plans
  FOR DELETE
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND user_id = auth.uid()
    AND status = 'draft'
  );
