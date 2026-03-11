-- Add attachments column to email_outbound table
-- Supports file attachments via Cloudinary URLs

ALTER TABLE email_outbound
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN email_outbound.attachments IS 'Array of attachment objects: {filename, url, type, size}';

-- Enable RLS on email_alias_limits if not already enabled
ALTER TABLE email_alias_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own email_alias_limits
CREATE POLICY "Users can view their own email_alias_limits"
ON email_alias_limits
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM email_aliases
    WHERE email_aliases.id = email_alias_limits.alias_id
    AND email_aliases.created_by = auth.uid()
  )
);

-- Policy: Users can update their own email_alias_limits
CREATE POLICY "Users can update their own email_alias_limits"
ON email_alias_limits
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM email_aliases
    WHERE email_aliases.id = email_alias_limits.alias_id
    AND email_aliases.created_by = auth.uid()
  )
);

-- Policy: Service role full access on email_alias_limits
CREATE POLICY "Service role full access on email_alias_limits"
ON email_alias_limits
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');