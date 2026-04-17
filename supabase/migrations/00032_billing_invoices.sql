-- ============================================================
-- Phase 7 (Commercial): 請求書管理（法人向け・インボイス制度対応）
--
-- 方針:
--   - 本プロダクトは法人向け B2B SaaS のため、オンライン決済
--     (Stripe等) ではなく請求書払い (銀行振込 / 口座振替) を主体とする。
--   - 適格請求書等保存方式（インボイス制度, 令和5年10月開始）に対応。
--   - tenants.stripe_customer_id / stripe_subscription_id は廃止。
-- ============================================================

-- =========================
-- 1. tenants: Stripe カラム廃止
-- =========================

ALTER TABLE tenants DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE tenants DROP COLUMN IF EXISTS stripe_subscription_id;

-- 顧客コード (自社採番の法人識別子、請求書にも記載)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_customer_code TEXT UNIQUE;

-- =========================
-- 2. billing_accounts: 請求先情報
-- =========================
-- 1テナントにつき複数の請求先を持てる設計 (部門別請求等に対応)。
-- デフォルト請求先は is_default = true で1件のみ。

CREATE TABLE billing_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,

  -- 法人情報
  company_name TEXT NOT NULL,                         -- 正式法人名
  company_name_kana TEXT,                             -- フリガナ
  corporate_number TEXT,                              -- 法人番号 (13桁)
  qualified_invoice_number TEXT,                      -- 適格請求書発行事業者登録番号 (T + 13桁)

  -- 住所
  postal_code TEXT,
  prefecture TEXT,
  address_line1 TEXT,
  address_line2 TEXT,

  -- 担当者
  contact_name TEXT NOT NULL,
  contact_department TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,

  -- 支払条件
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer'
    CHECK (payment_method IN ('bank_transfer', 'direct_debit', 'credit_card', 'other')),
  payment_terms_days INTEGER NOT NULL DEFAULT 30,     -- 月末締め翌月末払い = 30
  closing_day INTEGER NOT NULL DEFAULT 31             -- 締日 (末日 = 31)
    CHECK (closing_day BETWEEN 1 AND 31),

  -- 請求書送付
  delivery_method TEXT NOT NULL DEFAULT 'email'
    CHECK (delivery_method IN ('email', 'postal', 'both')),
  delivery_email TEXT,

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT qualified_invoice_number_format
    CHECK (qualified_invoice_number IS NULL OR qualified_invoice_number ~ '^T[0-9]{13}$'),
  CONSTRAINT corporate_number_format
    CHECK (corporate_number IS NULL OR corporate_number ~ '^[0-9]{13}$')
);

-- 1テナントにつきデフォルト請求先は最大1件
CREATE UNIQUE INDEX billing_accounts_tenant_default_uniq
  ON billing_accounts(tenant_id)
  WHERE is_default = true;

CREATE INDEX idx_billing_accounts_tenant ON billing_accounts(tenant_id);

-- =========================
-- 3. billing_contracts: 契約
-- =========================
-- 契約単位 = (テナント, 期間, プラン, 単価, 契約シート数)
-- 契約更新のたびに新レコードを作成し、旧契約は終了日を記録。

CREATE TABLE billing_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  billing_account_id UUID NOT NULL REFERENCES billing_accounts(id) ON DELETE RESTRICT,

  plan TEXT NOT NULL
    CHECK (plan IN ('starter', 'professional', 'enterprise')),
  contract_number TEXT NOT NULL UNIQUE,               -- 自社採番の契約番号

  -- 期間
  start_date DATE NOT NULL,
  end_date DATE,                                      -- NULL = 継続中
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  renewal_notice_days INTEGER NOT NULL DEFAULT 60,    -- 自動更新の解約予告日数

  -- 課金条件
  billing_cycle TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),
  unit_price_jpy INTEGER NOT NULL,                    -- 1シート単価 (税抜, 円)
  committed_seats INTEGER NOT NULL DEFAULT 0,         -- 契約シート数 (最低保証)
  overage_unit_price_jpy INTEGER,                     -- 超過シート単価 (NULL = unit_price_jpy と同じ)

  -- その他
  discount_rate NUMERIC(5,4) DEFAULT 0               -- 割引率 (0.1 = 10%OFF)
    CHECK (discount_rate >= 0 AND discount_rate <= 1),
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_contract_period CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_billing_contracts_tenant ON billing_contracts(tenant_id);
CREATE INDEX idx_billing_contracts_account ON billing_contracts(billing_account_id);
CREATE INDEX idx_billing_contracts_active
  ON billing_contracts(tenant_id)
  WHERE end_date IS NULL;

-- =========================
-- 4. billing_seat_snapshots: 月次シート数スナップショット
-- =========================
-- 月次締め時に active=true のユーザー数をスナップショット。
-- 請求計算の根拠とする (監査証跡)。

CREATE TABLE billing_seat_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES billing_contracts(id) ON DELETE RESTRICT,
  snapshot_month DATE NOT NULL,                       -- 月初 (例: 2026-04-01)

  active_seats INTEGER NOT NULL,
  billable_seats INTEGER NOT NULL,                    -- max(active_seats, committed_seats)
  calculation_method TEXT NOT NULL DEFAULT 'max_mid_and_end'
    CHECK (calculation_method IN ('max_mid_and_end', 'end_of_month', 'peak')),
  seat_detail JSONB NOT NULL DEFAULT '[]',            -- [{user_id, joined_at, removed_at}]

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (contract_id, snapshot_month)
);

CREATE INDEX idx_billing_seat_snapshots_tenant_month
  ON billing_seat_snapshots(tenant_id, snapshot_month);

-- =========================
-- 5. invoices: 請求書
-- =========================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  billing_account_id UUID NOT NULL REFERENCES billing_accounts(id) ON DELETE RESTRICT,
  contract_id UUID REFERENCES billing_contracts(id) ON DELETE RESTRICT,

  -- 請求書番号 (適格請求書の必須項目、自社採番)
  invoice_number TEXT NOT NULL UNIQUE,

  -- ステータス
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'issued', 'sent', 'paid', 'overdue', 'void', 'credit_note')),

  -- 日付
  issue_date DATE NOT NULL,                           -- 発行日
  due_date DATE NOT NULL,                             -- 支払期限
  period_start DATE NOT NULL,                         -- 対象期間 開始
  period_end DATE NOT NULL,                           -- 対象期間 終了

  -- 金額 (JPY, 税抜ベース)
  subtotal_jpy INTEGER NOT NULL DEFAULT 0,            -- 税抜小計
  tax_10_subtotal_jpy INTEGER NOT NULL DEFAULT 0,     -- 10%対象 税抜小計
  tax_10_amount_jpy INTEGER NOT NULL DEFAULT 0,       -- 10%消費税額
  tax_8_subtotal_jpy INTEGER NOT NULL DEFAULT 0,      -- 8%軽減税率対象 (通常は0)
  tax_8_amount_jpy INTEGER NOT NULL DEFAULT 0,
  tax_exempt_subtotal_jpy INTEGER NOT NULL DEFAULT 0, -- 非課税対象
  total_jpy INTEGER NOT NULL DEFAULT 0,               -- 請求合計 (税込)

  -- 適格請求書発行事業者情報 (発行時点でスナップショット)
  issuer_qualified_invoice_number TEXT NOT NULL,
  issuer_name TEXT NOT NULL,
  issuer_address TEXT,

  -- 請求先情報 (発行時点でスナップショット)
  billing_company_name TEXT NOT NULL,
  billing_contact_name TEXT,
  billing_address TEXT,

  -- 支払情報
  payment_method TEXT NOT NULL
    CHECK (payment_method IN ('bank_transfer', 'direct_debit', 'credit_card', 'other')),
  bank_info JSONB DEFAULT '{}',                       -- {bank_name, branch, account_type, account_number, account_holder}

  -- 送付
  sent_at TIMESTAMPTZ,
  sent_to_emails TEXT[],

  -- 消込
  paid_at TIMESTAMPTZ,                                -- 全額入金完了日時
  paid_amount_jpy INTEGER NOT NULL DEFAULT 0,         -- 消込済み金額

  -- メタ
  notes TEXT,
  internal_notes TEXT,                                -- 社内向けメモ (PDFに出力されない)
  pdf_storage_path TEXT,                              -- Supabase Storage のパス
  related_invoice_id UUID REFERENCES invoices(id),    -- 修正請求書/赤伝の関連元

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  voided_reason TEXT,

  CONSTRAINT valid_period CHECK (period_end >= period_start),
  CONSTRAINT valid_due_date CHECK (due_date >= issue_date)
);

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date) WHERE status IN ('issued', 'sent', 'overdue');
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date DESC);

-- =========================
-- 6. invoice_items: 請求明細
-- =========================

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,

  description TEXT NOT NULL,                          -- 品目名
  detail TEXT,                                        -- 詳細説明
  quantity NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit TEXT,                                          -- "シート/月" 等
  unit_price_jpy INTEGER NOT NULL,                    -- 税抜単価
  amount_jpy INTEGER NOT NULL,                        -- 税抜金額 = quantity * unit_price_jpy

  tax_rate TEXT NOT NULL DEFAULT 'standard_10'
    CHECK (tax_rate IN ('standard_10', 'reduced_8', 'tax_exempt', 'non_taxable')),

  item_type TEXT NOT NULL DEFAULT 'subscription'
    CHECK (item_type IN ('subscription', 'seat_overage', 'one_time', 'adjustment', 'discount')),

  reference_snapshot_id UUID REFERENCES billing_seat_snapshots(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (invoice_id, line_no)
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

-- =========================
-- 7. invoice_payments: 入金記録（消込）
-- =========================

CREATE TABLE invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,

  paid_at DATE NOT NULL,                              -- 入金日
  amount_jpy INTEGER NOT NULL CHECK (amount_jpy > 0),
  payment_method TEXT NOT NULL
    CHECK (payment_method IN ('bank_transfer', 'direct_debit', 'credit_card', 'other')),

  reference TEXT,                                     -- 振込依頼人名・取引ID等
  bank_statement_id TEXT,                             -- 銀行明細の行ID
  reconciled_by UUID REFERENCES users(id),
  reconciled_at TIMESTAMPTZ,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_payments_invoice ON invoice_payments(invoice_id);
CREATE INDEX idx_invoice_payments_tenant_date ON invoice_payments(tenant_id, paid_at DESC);

-- =========================
-- 8. updated_at 自動更新トリガー
-- =========================

CREATE OR REPLACE FUNCTION billing_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER billing_accounts_updated_at
  BEFORE UPDATE ON billing_accounts
  FOR EACH ROW EXECUTE FUNCTION billing_set_updated_at();

CREATE TRIGGER billing_contracts_updated_at
  BEFORE UPDATE ON billing_contracts
  FOR EACH ROW EXECUTE FUNCTION billing_set_updated_at();

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION billing_set_updated_at();

CREATE TRIGGER invoice_payments_updated_at
  BEFORE UPDATE ON invoice_payments
  FOR EACH ROW EXECUTE FUNCTION billing_set_updated_at();

-- =========================
-- 9. RLS Policies
-- =========================
-- 請求情報は機密度が高いため:
--   - 閲覧/操作: admin 以上
--   - super_admin はクロステナント可能 (運営)
--   - member/manager は一切アクセス不可

ALTER TABLE billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_seat_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

-- billing_accounts
CREATE POLICY billing_accounts_admin_select ON billing_accounts
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
  );
CREATE POLICY billing_accounts_super_admin_select ON billing_accounts
  FOR SELECT USING ((auth.jwt() ->> 'role') = 'super_admin');
CREATE POLICY billing_accounts_admin_write ON billing_accounts
  FOR ALL USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') = 'admin'
  );
CREATE POLICY billing_accounts_super_admin_write ON billing_accounts
  FOR ALL USING ((auth.jwt() ->> 'role') = 'super_admin');

-- billing_contracts: 契約は super_admin のみ書き込み可 (運営が契約登録)
CREATE POLICY billing_contracts_tenant_select ON billing_contracts
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
  );
CREATE POLICY billing_contracts_super_admin_all ON billing_contracts
  FOR ALL USING ((auth.jwt() ->> 'role') = 'super_admin');

-- billing_seat_snapshots: 閲覧のみ (書き込みは batch/service_role)
CREATE POLICY billing_seat_snapshots_tenant_select ON billing_seat_snapshots
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
  );
CREATE POLICY billing_seat_snapshots_super_admin_select ON billing_seat_snapshots
  FOR SELECT USING ((auth.jwt() ->> 'role') = 'super_admin');

-- invoices
CREATE POLICY invoices_tenant_select ON invoices
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
  );
CREATE POLICY invoices_super_admin_all ON invoices
  FOR ALL USING ((auth.jwt() ->> 'role') = 'super_admin');

-- invoice_items: invoice 経由でアクセス制御
CREATE POLICY invoice_items_tenant_select ON invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
        AND invoices.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
    )
  );
CREATE POLICY invoice_items_super_admin_all ON invoice_items
  FOR ALL USING ((auth.jwt() ->> 'role') = 'super_admin');

-- invoice_payments
CREATE POLICY invoice_payments_tenant_select ON invoice_payments
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
  );
CREATE POLICY invoice_payments_super_admin_all ON invoice_payments
  FOR ALL USING ((auth.jwt() ->> 'role') = 'super_admin');

-- =========================
-- 10. コメント (監査証跡として)
-- =========================

COMMENT ON TABLE billing_accounts IS '請求先情報 (法人単位・複数可)。RLS: admin以上のみ';
COMMENT ON TABLE billing_contracts IS '契約 (期間×プラン×単価×シート数)。super_admin が運営側から登録';
COMMENT ON TABLE billing_seat_snapshots IS '月次シート数スナップショット。請求根拠の監査証跡';
COMMENT ON TABLE invoices IS '請求書 (適格請求書等保存方式対応)。発行後の金額変更は不可';
COMMENT ON TABLE invoice_items IS '請求明細。税率区分を持つ';
COMMENT ON TABLE invoice_payments IS '入金記録（消込）。複数回入金 (分割払い) に対応';

COMMENT ON COLUMN billing_accounts.qualified_invoice_number IS '適格請求書発行事業者登録番号 (T+13桁)';
COMMENT ON COLUMN invoices.invoice_number IS '請求書番号 (自社採番、発行後変更不可)';
COMMENT ON COLUMN invoices.issuer_qualified_invoice_number IS '発行者側の登録番号 (発行時スナップショット)';
