-- Add attachments column to email_outbound table
-- Supports file attachments via Cloudinary URLs

ALTER TABLE email_outbound
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN email_outbound.attachments IS 'Array of attachment objects: {filename, url, type, size}';

-- Add attachments column to email_outbound table
ALTER TABLE email_outbound
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN email_outbound.attachments IS 'Array of attachment objects: {filename, url, type, size}';

-- RLS on email_alias_limits: Disabled for simplicity
-- Rate limit data is not sensitive; app validates alias ownership via outbound service
ALTER TABLE email_alias_limits DISABLE ROW LEVEL SECURITY;

-- Ensure test alias has a rate limit record (if not exists)
INSERT INTO email_alias_limits (id, alias_id, daily_limit, monthly_limit, sent_today, sent_this_month, last_reset_date, reset_month_date, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'a685b202-7ac8-4477-b47f-de9bc97332d5',
  100, 3000, 0, 0,
  CURRENT_DATE,
  CURRENT_DATE,
  NOW(), NOW()
)
ON CONFLICT (alias_id) DO NOTHING;