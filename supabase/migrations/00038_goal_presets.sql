-- ============================================
-- Goal Presets (テンプレート化された目標セット)
--
-- 目的: 月初等に「営業の月次KPI」のような目標セットを保存しておき、
-- 担当者×項目のグリッドでまとめて目標を作成できるようにする。
--
-- 既存テーブル (goals, goal_snapshots) には一切変更を加えない追加マイグレーション。
-- goals.template_id は report_templates(id) を指し続けるため、本マイグレーションでは
-- 別の名前 (report_template_id) を採用して名前衝突を回避する。
-- ============================================

CREATE TABLE goal_presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_level TEXT NOT NULL DEFAULT 'individual'
    CHECK (default_level IN ('company', 'department', 'team', 'individual')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE goal_preset_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  preset_id UUID NOT NULL REFERENCES goal_presets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  report_template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
  kpi_field_key TEXT,
  default_target_value NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──

CREATE INDEX idx_goal_presets_tenant ON goal_presets(tenant_id);
CREATE INDEX idx_goal_preset_items_preset
  ON goal_preset_items(preset_id, sort_order);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_goal_presets_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER goal_presets_updated_at
  BEFORE UPDATE ON goal_presets
  FOR EACH ROW EXECUTE FUNCTION update_goal_presets_updated_at();

-- ── RLS ──

ALTER TABLE goal_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_preset_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goal_presets_tenant_isolation" ON goal_presets
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "goal_preset_items_tenant_isolation" ON goal_preset_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM goal_presets
      WHERE goal_presets.id = goal_preset_items.preset_id
        AND goal_presets.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );
