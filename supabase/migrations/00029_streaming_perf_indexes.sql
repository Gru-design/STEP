-- Additional composite indexes for dashboard, activity feed, and list pages
-- Complements 00021 and 00025

-- 1. Report entries by tenant + status + created_at (Activity Feed query)
-- Covers: layout.tsx activity feed — recent submitted entries ordered by created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_report_entries_tenant_status_created
  ON report_entries(tenant_id, status, created_at DESC);

-- 2. Peer bonuses by tenant + created_at (Activity Feed query)
-- Covers: layout.tsx activity feed — recent peer bonuses
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_peer_bonuses_tenant_created
  ON peer_bonuses(tenant_id, created_at DESC);

-- 3. Knowledge posts by tenant + created_at (knowledge listing, load more)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_knowledge_posts_tenant_created
  ON knowledge_posts(tenant_id, created_at DESC);

-- 4. Team members by team_id (team member lookup, dashboard team stats)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_team
  ON team_members(team_id, user_id);

-- 5. Deals by tenant + updated_at (deals page, default sort order)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_tenant_updated
  ON deals(tenant_id, updated_at DESC);

-- 6. Partial index: pending nudges only (dashboard badge count)
-- Dramatically speeds up the count query since most nudges are not pending
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nudges_tenant_pending
  ON nudges(tenant_id) WHERE status = 'pending';
