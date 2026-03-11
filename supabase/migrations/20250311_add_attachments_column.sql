-- Add attachments column to email_outbound table
-- Supports file attachments via Cloudinary URLs

ALTER TABLE email_outbound
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN email_outbound.attachments IS 'Array of attachment objects: {filename, url, type, size}';

-- Enable RLS on email_alias_limits
ALTER TABLE email_alias_limits ENABLE ROW LEVEL SECURITY;

-- Simple policy: any authenticated user can read rate limits
-- Rate limit data is not sensitive; needed for frontend to check limits
CREATE POLICY "Authenticated users can read email_alias_limits"
ON email_alias_limits
FOR SELECT
USING (auth.role() = 'authenticated');

-- Authenticated users can update rate limits (incremented by server-side code)
CREATE POLICY "Authenticated users can update email_alias_limits"
ON email_alias_limits
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Service role full access (bypasses all RLS)
CREATE POLICY "Service role full access on email_alias_limits"
ON email_alias_limits
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Ensure the test alias has a rate limit record
-- (This should normally be created when alias is created)
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