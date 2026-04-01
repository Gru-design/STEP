-- ピアボーナス（Peer Bonus）テーブル
-- 毎営業日1P付与。日報提出時に感謝を伝えたい相手に1P送信。

CREATE TABLE peer_bonuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES users(id) NOT NULL,
  to_user_id UUID REFERENCES users(id) NOT NULL,
  report_entry_id UUID REFERENCES report_entries(id) ON DELETE SET NULL,
  message TEXT NOT NULL,                    -- 感謝メッセージ（必須）
  bonus_date DATE NOT NULL DEFAULT CURRENT_DATE,  -- ポイント付与日
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- 1日1人1回のみ送信可能
  UNIQUE (from_user_id, bonus_date),
  -- 自分自身には送れない
  CHECK (from_user_id <> to_user_id)
);

-- インデックス
CREATE INDEX idx_peer_bonuses_tenant ON peer_bonuses(tenant_id);
CREATE INDEX idx_peer_bonuses_to_user ON peer_bonuses(to_user_id);
CREATE INDEX idx_peer_bonuses_from_user ON peer_bonuses(from_user_id);
CREATE INDEX idx_peer_bonuses_date ON peer_bonuses(bonus_date);

-- RLSポリシー
ALTER TABLE peer_bonuses ENABLE ROW LEVEL SECURITY;

-- 同一テナントのメンバーは閲覧可能（感謝の可視化）
CREATE POLICY "peer_bonuses_select" ON peer_bonuses
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- 本人のみ送信可能
CREATE POLICY "peer_bonuses_insert" ON peer_bonuses
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND from_user_id = auth.uid()
  );

-- 削除は不可（送った感謝は取り消せない設計）
