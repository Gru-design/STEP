-- Dashboard performance optimization indexes
-- These indexes target the most frequent query patterns on the dashboard page.

-- report_entries: tenant + status + report_date (manager/admin submission stats, weekly trends)
CREATE INDEX IF NOT EXISTS idx_report_entries_tenant_status_date
  ON report_entries(tenant_id, status, report_date);

-- report_entries: user + status + report_date (member streak/today check)
CREATE INDEX IF NOT EXISTS idx_report_entries_user_status_date
  ON report_entries(user_id, status, report_date);

-- goal_snapshots: goal + date DESC (latest snapshot per goal lookup)
CREATE INDEX IF NOT EXISTS idx_goal_snapshots_goal_date
  ON goal_snapshots(goal_id, snapshot_date DESC);

-- nudges: tenant + status (pending nudge count for managers)
CREATE INDEX IF NOT EXISTS idx_nudges_tenant_status
  ON nudges(tenant_id, status);

-- deals: tenant + status (active deal count for admin dashboard)
CREATE INDEX IF NOT EXISTS idx_deals_tenant_active_status
  ON deals(tenant_id, status);
