-- Add is_active and deactivated_at columns to tenants table
-- Required for tenant soft-delete (deactivation) from super admin panel

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

-- Index for filtering active/inactive tenants
CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active);
