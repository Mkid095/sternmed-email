-- Add attachments column to email_inbound table
-- Supports file attachments via Cloudinary storage paths

ALTER TABLE email_inbound
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN email_inbound.attachments IS 'Array of attachment objects: {id, filename, contentType, size, storagePath}';