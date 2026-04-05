-- Add 'industry' step to onboarding flow and industry column to tenants
-- Flow: welcome → industry → template → team → invite → done

-- 1. Update onboarding_step CHECK constraint to include 'industry'
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_onboarding_step_check;
ALTER TABLE tenants ADD CONSTRAINT tenants_onboarding_step_check
  CHECK (onboarding_step IN ('welcome', 'industry', 'template', 'team', 'invite', 'done'));

-- 2. Add industry column to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS industry TEXT
  CHECK (industry IN ('staffing_agency', 'recruitment', 'media'));

-- 3. Update existing tenants in 'welcome' step to keep flow consistent
-- (no-op if none are in welcome state)
