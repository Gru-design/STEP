-- Performance optimization: compound indexes for common query patterns
-- These indexes target the most frequently executed queries identified through analysis

-- 1. Daily report listing (most frequent query in the app)
-- Covers: dashboard page, reports feed, cron nudge checks
CREATE INDEX IF NOT EXISTS idx_report_entries_tenant_date_desc
  ON report_entries(tenant_id, report_date DESC);

-- 2. User's own report lookup (streak calculation, my-reports page)
CREATE INDEX IF NOT EXISTS idx_report_entries_user_status_date_desc
  ON report_entries(user_id, status, report_date DESC);

-- 3. Template listing by tenant + type (template selector, report creation)
CREATE INDEX IF NOT EXISTS idx_report_templates_tenant_type
  ON report_templates(tenant_id, type);

-- 4. Nudge processing (cron job hot path)
CREATE INDEX IF NOT EXISTS idx_nudges_target_status_created
  ON nudges(target_user_id, status, created_at DESC);

-- 5. Goal listing by tenant + level (dashboard, goals page)
CREATE INDEX IF NOT EXISTS idx_goals_tenant_level
  ON goals(tenant_id, level);

-- 6. Weekly plan lookup by user + status (plan approval, review)
CREATE INDEX IF NOT EXISTS idx_weekly_plans_user_status
  ON weekly_plans(user_id, status);

-- 7. Goal snapshots lookup (dashboard progress display)
CREATE INDEX IF NOT EXISTS idx_goal_snapshots_goal_date_desc
  ON goal_snapshots(goal_id, snapshot_date DESC);

-- 8. Peer bonus lookup (dashboard peer bonus section)
CREATE INDEX IF NOT EXISTS idx_peer_bonuses_to_user
  ON peer_bonuses(to_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_peer_bonuses_from_user_date
  ON peer_bonuses(from_user_id, bonus_date);

-- 9. Deal stage aggregation (funnel chart on admin dashboard)
CREATE INDEX IF NOT EXISTS idx_deals_tenant_status_stage
  ON deals(tenant_id, status, stage_id);
