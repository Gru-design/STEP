-- オンボーディング管理
-- tenants.onboarding_step: 現在のステップ (NULL = 完了済み)
-- 新規テナント作成時はデフォルトで 'welcome' から開始

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_step TEXT
  CHECK (onboarding_step IN ('welcome', 'template', 'team', 'invite', 'done'))
  DEFAULT 'welcome';

-- 既存テナントは完了済みとして NULL にする
UPDATE tenants SET onboarding_step = NULL WHERE onboarding_step = 'welcome';
