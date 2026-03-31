-- =========================
-- Fix missing ON DELETE CASCADE on foreign keys
-- =========================

-- reactions.user_id
ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_user_id_fkey;
ALTER TABLE reactions ADD CONSTRAINT reactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- goals
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_tenant_id_fkey;
ALTER TABLE goals ADD CONSTRAINT goals_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_parent_id_fkey;
ALTER TABLE goals ADD CONSTRAINT goals_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES goals(id) ON DELETE CASCADE;

ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_template_id_fkey;
ALTER TABLE goals ADD CONSTRAINT goals_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES report_templates(id) ON DELETE SET NULL;

ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_owner_id_fkey;
ALTER TABLE goals ADD CONSTRAINT goals_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_team_id_fkey;
ALTER TABLE goals ADD CONSTRAINT goals_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- pipeline_stages
ALTER TABLE pipeline_stages DROP CONSTRAINT IF EXISTS pipeline_stages_tenant_id_fkey;
ALTER TABLE pipeline_stages ADD CONSTRAINT pipeline_stages_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- deals
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_tenant_id_fkey;
ALTER TABLE deals ADD CONSTRAINT deals_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_user_id_fkey;
ALTER TABLE deals ADD CONSTRAINT deals_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_stage_id_fkey;
ALTER TABLE deals ADD CONSTRAINT deals_stage_id_fkey
  FOREIGN KEY (stage_id) REFERENCES pipeline_stages(id) ON DELETE CASCADE;

-- deal_history
ALTER TABLE deal_history DROP CONSTRAINT IF EXISTS deal_history_from_stage_fkey;
ALTER TABLE deal_history ADD CONSTRAINT deal_history_from_stage_fkey
  FOREIGN KEY (from_stage) REFERENCES pipeline_stages(id) ON DELETE SET NULL;

ALTER TABLE deal_history DROP CONSTRAINT IF EXISTS deal_history_to_stage_fkey;
ALTER TABLE deal_history ADD CONSTRAINT deal_history_to_stage_fkey
  FOREIGN KEY (to_stage) REFERENCES pipeline_stages(id) ON DELETE SET NULL;

-- weekly_plans
ALTER TABLE weekly_plans DROP CONSTRAINT IF EXISTS weekly_plans_tenant_id_fkey;
ALTER TABLE weekly_plans ADD CONSTRAINT weekly_plans_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE weekly_plans DROP CONSTRAINT IF EXISTS weekly_plans_user_id_fkey;
ALTER TABLE weekly_plans ADD CONSTRAINT weekly_plans_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE weekly_plans DROP CONSTRAINT IF EXISTS weekly_plans_template_id_fkey;
ALTER TABLE weekly_plans ADD CONSTRAINT weekly_plans_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES report_templates(id) ON DELETE SET NULL;

ALTER TABLE weekly_plans DROP CONSTRAINT IF EXISTS weekly_plans_approved_by_fkey;
ALTER TABLE weekly_plans ADD CONSTRAINT weekly_plans_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- approval_logs
ALTER TABLE approval_logs DROP CONSTRAINT IF EXISTS approval_logs_actor_id_fkey;
ALTER TABLE approval_logs ADD CONSTRAINT approval_logs_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE;

-- knowledge_posts
ALTER TABLE knowledge_posts DROP CONSTRAINT IF EXISTS knowledge_posts_tenant_id_fkey;
ALTER TABLE knowledge_posts ADD CONSTRAINT knowledge_posts_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE knowledge_posts DROP CONSTRAINT IF EXISTS knowledge_posts_user_id_fkey;
ALTER TABLE knowledge_posts ADD CONSTRAINT knowledge_posts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- weekly_digests
ALTER TABLE weekly_digests DROP CONSTRAINT IF EXISTS weekly_digests_tenant_id_fkey;
ALTER TABLE weekly_digests ADD CONSTRAINT weekly_digests_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- integrations
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_tenant_id_fkey;
ALTER TABLE integrations ADD CONSTRAINT integrations_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- activity_logs
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_tenant_id_fkey;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- =========================
-- Add missing indexes
-- =========================

CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_nudges_user_read ON nudges(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_approval_logs_target ON approval_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_tenant_status ON weekly_plans(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_status ON deals(tenant_id, approval_status);
