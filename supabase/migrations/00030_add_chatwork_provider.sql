-- Add chatwork to integrations.provider enum
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_provider_check;
ALTER TABLE integrations ADD CONSTRAINT integrations_provider_check
  CHECK (provider IN ('google_calendar', 'gmail', 'slack', 'teams', 'cti', 'chatwork'));
