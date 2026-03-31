-- ============================================================
-- Phase 3: Nudge & Gamification Tables
-- ============================================================

-- ── Nudges ──
CREATE TABLE nudges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  target_user_id UUID NOT NULL REFERENCES users(id),
  trigger_type TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'actioned', 'dismissed')),
  actioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nudges_user ON nudges(target_user_id);

ALTER TABLE nudges ENABLE ROW LEVEL SECURITY;

-- Target user can see their own nudges
CREATE POLICY "nudges_select_own" ON nudges
  FOR SELECT USING (
    target_user_id = auth.uid()
    OR (
      (auth.jwt() ->> 'tenant_id')::uuid = tenant_id
      AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
    )
  );

-- Service role handles INSERT (no user-facing INSERT policy)
-- Allow service_role full access (bypasses RLS by default)

-- ── Badges ──
CREATE TABLE badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  condition JSONB NOT NULL,
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges_select_all" ON badges
  FOR SELECT TO authenticated
  USING (true);

-- ── User Badges ──
CREATE TABLE user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  badge_id UUID NOT NULL REFERENCES badges(id),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_badges_select_all" ON user_badges
  FOR SELECT TO authenticated
  USING (true);

-- ── User Levels ──
CREATE TABLE user_levels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_levels_select_all" ON user_levels
  FOR SELECT TO authenticated
  USING (true);
