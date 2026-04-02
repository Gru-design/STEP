-- Additional performance indexes for cron jobs and dashboard queries
-- These complement the indexes in 00021_performance_indexes.sql

-- 1. Nudge processing by tenant + status (cron job batch processing)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nudges_tenant_status
  ON nudges(tenant_id, status);

-- 2. Report entries by template + date + status (cron nudge submission checks)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_report_entries_template_date_status
  ON report_entries(template_id, report_date, status);

-- 3. Weekly plans by tenant + status (approval queue listing)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weekly_plans_tenant_status
  ON weekly_plans(tenant_id, status);

-- 4. Goals by tenant + owner (1on1 page, goal assignment queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_tenant_owner
  ON goals(tenant_id, owner_id);

-- 5. Goals by tenant + team (team goal filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_tenant_team
  ON goals(tenant_id, team_id);

-- 6. Integrations by tenant + status (nudge sender, webhook dispatch)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_integrations_tenant_status
  ON integrations(tenant_id, status);

-- 7. User badges by user + earned_at (badge display, gamification)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_badges_user_earned
  ON user_badges(user_id, earned_at DESC);
