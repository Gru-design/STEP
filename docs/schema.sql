-- ============================================
-- STEP Database Schema (全23テーブル)
-- ============================================

-- ── Core ──

CREATE TABLE tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'professional', 'enterprise')),
  domain TEXT,
  settings JSONB DEFAULT '{}',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  report_visibility TEXT NOT NULL DEFAULT 'team' CHECK (report_visibility IN ('manager_only', 'team', 'tenant_all')),
  -- manager_only: マネージャー以上のみ閲覧
  -- team: 同一チーム全員が閲覧可能 (デフォルト)
  -- tenant_all: テナント全員が閲覧可能
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE users (
  id UUID PRIMARY KEY, -- = auth.users.id
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('super_admin', 'admin', 'manager', 'member')),
  name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,                      -- 電話番号
  slack_id TEXT,                   -- Slack メンバーID or 表示名
  calendar_url TEXT,               -- Calendly / Google Cal 予約ページURL
  bio TEXT,                        -- 自己紹介 (任意)
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  name TEXT NOT NULL,
  manager_id UUID REFERENCES users(id),
  parent_team_id UUID REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (team_id, user_id)
);

-- ── Report & Template ──

CREATE TABLE report_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'plan', 'checkin')),
  target_roles TEXT[] DEFAULT '{"member"}',
  schema JSONB NOT NULL DEFAULT '{"sections":[]}',
  visibility_override TEXT CHECK (visibility_override IN ('manager_only', 'team', 'tenant_all')),
  -- NULL = テナント設定に従う, 値あり = テンプレート単位で上書き
  is_system BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE report_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  template_id UUID REFERENCES report_templates(id) NOT NULL,
  report_date DATE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, template_id, report_date)
);

CREATE TABLE template_field_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE NOT NULL,
  field_key TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID REFERENCES report_entries(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'fire', 'clap', 'heart', 'eyes')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── Management Cycle ──

CREATE TABLE weekly_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  week_start DATE NOT NULL,
  template_id UUID REFERENCES report_templates(id),
  items JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  execution_rate NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, week_start)
);

CREATE TABLE approval_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('weekly_plan', 'deal')),
  target_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected')),
  actor_id UUID REFERENCES users(id) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── Goals ──

CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  parent_id UUID REFERENCES goals(id),
  level TEXT NOT NULL CHECK (level IN ('company', 'department', 'team', 'individual')),
  name TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  kpi_field_key TEXT,
  template_id UUID REFERENCES report_templates(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  owner_id UUID REFERENCES users(id),
  team_id UUID REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE goal_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  actual_value NUMERIC NOT NULL DEFAULT 0,
  progress_rate NUMERIC NOT NULL DEFAULT 0,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── Deals (Funnel) ──

CREATE TABLE pipeline_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  conversion_target NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  stage_id UUID REFERENCES pipeline_stages(id) NOT NULL,
  company TEXT NOT NULL,
  title TEXT,
  value NUMERIC,
  persona JSONB DEFAULT '{}',
  due_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'hold')),
  approval_status TEXT DEFAULT 'none' CHECK (approval_status IN ('none', 'submitted', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE deal_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  from_stage UUID REFERENCES pipeline_stages(id),
  to_stage UUID REFERENCES pipeline_stages(id) NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── Engagement (Nudge & Gamification) ──

CREATE TABLE nudges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  target_user_id UUID REFERENCES users(id) NOT NULL,
  trigger_type TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'actioned', 'dismissed')),
  actioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  condition JSONB NOT NULL,
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  badge_id UUID REFERENCES badges(id) NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, badge_id)
);

CREATE TABLE user_levels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL UNIQUE,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── Insight & Knowledge ──

CREATE TABLE knowledge_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE weekly_digests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  week_start DATE NOT NULL,
  rankings JSONB NOT NULL DEFAULT '{}',
  mvp JSONB NOT NULL DEFAULT '{}',
  stats JSONB NOT NULL DEFAULT '{}',
  badges_earned JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (tenant_id, week_start)
);

-- ── Infrastructure ──

CREATE TABLE integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google_calendar', 'gmail', 'slack', 'teams', 'cti')),
  credentials JSONB NOT NULL DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  source TEXT NOT NULL,
  raw_data JSONB NOT NULL,
  collected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── Indexes ──

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_teams_tenant ON teams(tenant_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_report_templates_tenant ON report_templates(tenant_id);
CREATE INDEX idx_report_entries_tenant ON report_entries(tenant_id);
CREATE INDEX idx_report_entries_user_date ON report_entries(user_id, report_date);
CREATE INDEX idx_report_entries_search ON report_entries USING GIN (search_vector);
CREATE INDEX idx_weekly_plans_user_week ON weekly_plans(user_id, week_start);
CREATE INDEX idx_goals_tenant ON goals(tenant_id);
CREATE INDEX idx_deals_tenant ON deals(tenant_id);
CREATE INDEX idx_deals_user ON deals(user_id);
CREATE INDEX idx_deals_stage ON deals(stage_id);
CREATE INDEX idx_nudges_user ON nudges(target_user_id);
CREATE INDEX idx_knowledge_search ON knowledge_posts USING GIN (search_vector);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id, collected_at);

-- ── RLS Policies ──

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_field_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 基本ポリシー: 同一テナントのみ (全テーブルに適用)
-- 各テーブルごとに CREATE POLICY で tenant_isolation を設定
-- (Phase 実装時に詳細なロール別ポリシーを追加)

-- ── Functions & Triggers ──

-- search_vector 自動更新 (knowledge_posts)
CREATE OR REPLACE FUNCTION update_knowledge_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple',
    COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.body, '') || ' ' || array_to_string(COALESCE(NEW.tags, '{}'), ' ')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_search_update
  BEFORE INSERT OR UPDATE ON knowledge_posts
  FOR EACH ROW EXECUTE FUNCTION update_knowledge_search_vector();

-- search_vector 自動更新 (report_entries)
CREATE OR REPLACE FUNCTION update_report_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple', COALESCE(NEW.data::text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER report_search_update
  BEFORE INSERT OR UPDATE ON report_entries
  FOR EACH ROW EXECUTE FUNCTION update_report_search_vector();

-- deal_history 自動記録
CREATE OR REPLACE FUNCTION log_deal_stage_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    INSERT INTO deal_history (deal_id, from_stage, to_stage)
    VALUES (NEW.id, OLD.stage_id, NEW.stage_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deal_stage_change
  AFTER UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION log_deal_stage_change();
