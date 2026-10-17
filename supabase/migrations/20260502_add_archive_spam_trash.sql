-- ============================================================================
-- ARCHIVE, SPAM AND TRASH
-- ============================================================================
-- Adds the state the mailbox needs for the Archive, Spam and Trash folders.
--
-- Trash already exists: `deleted_at` was the soft-delete column all along, it
-- just had no view over it and no way back. This migration gives it a UI and
-- adds restore.
--
-- Archive and Spam have no representation at all today, so they get columns.
--
-- Design notes
--   * archived_at is a TIMESTAMP rather than a boolean so "archived on ..." can
--     be shown, and so un-archiving is a single NULL write.
--   * is_spam is a boolean: a message is either spam or it is not, and there is
--     no meaningful "when" to show for it.
--   * deleted_at doubles as "in trash". An empty-trash operation hard-deletes
--     rows where deleted_at is older than the retention window.
--
-- All three are nullable/DEFAULTed so existing rows stay valid and the change
-- is safe to apply to a live mailbox.
-- ============================================================================

BEGIN;

-- ── Inbound ───────────────────────────────────────────────────────
ALTER TABLE public.email_inbound
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

ALTER TABLE public.email_inbound
  ADD COLUMN IF NOT EXISTS is_spam BOOLEAN NOT NULL DEFAULT false;

-- ── Outbound (Archive applies to sent mail too) ───────────────────
ALTER TABLE public.email_outbound
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

COMMENT ON COLUMN public.email_inbound.archived_at IS
  'Set when the message is moved to Archive. NULL means it is in the inbox.';
COMMENT ON COLUMN public.email_inbound.is_spam IS
  'True when reported as spam. Filtered out of the inbox by default.';
COMMENT ON COLUMN public.email_outbound.archived_at IS
  'Set when a sent message is moved to Archive.';
COMMENT ON COLUMN public.email_inbound.deleted_at IS
  'Set when moved to Trash. Rows with a non-null value appear in Trash.';

-- ── Indexes ───────────────────────────────────────────────────────
-- Every folder view filters on (alias_id, <state>, deleted_at IS NULL) and
-- sorts by date. Without these the views degrade to sequential scans once a
-- mailbox passes a few thousand messages.
CREATE INDEX IF NOT EXISTS idx_email_inbound_alias_state
  ON public.email_inbound (alias_id, deleted_at, archived_at, is_spam, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_inbound_archived
  ON public.email_inbound (alias_id, archived_at)
  WHERE archived_at IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_email_inbound_spam
  ON public.email_inbound (alias_id)
  WHERE is_spam = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_email_inbound_trash
  ON public.email_inbound (alias_id, deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_outbound_alias_state
  ON public.email_outbound (alias_id, deleted_at, archived_at, created_at DESC);

-- ── Counts for the sidebar badges ─────────────────────────────────
-- One round trip for all three counts, instead of three separate queries on
-- every navigation.
CREATE OR REPLACE FUNCTION public.get_mailbox_folder_counts(p_alias_id UUID)
RETURNS TABLE (
  inbox_count    BIGINT,
  archived_count BIGINT,
  spam_count     BIGINT,
  trash_count    BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.email_inbound
      WHERE alias_id = p_alias_id
        AND deleted_at IS NULL
        AND archived_at IS NULL
        AND is_spam = false
        AND is_read = false)                                        AS inbox_count,
    (SELECT count(*) FROM public.email_inbound
      WHERE alias_id = p_alias_id
        AND deleted_at IS NULL
        AND archived_at IS NOT NULL)                                AS archived_count,
    (SELECT count(*) FROM public.email_inbound
      WHERE alias_id = p_alias_id
        AND deleted_at IS NULL
        AND is_spam = true)                                         AS spam_count,
    (SELECT count(*) FROM public.email_inbound
      WHERE alias_id = p_alias_id
        AND deleted_at IS NOT NULL)                                 AS trash_count;
$$;

COMMENT ON FUNCTION public.get_mailbox_folder_counts(UUID) IS
  'Unread-inbox, archived, spam and trash counts for one alias.';

-- These run as the table owner (SECURITY DEFINER), so they must not be
-- callable by the browser. Postgres grants EXECUTE on new functions to PUBLIC
-- by default, which would hand `anon` a privileged path around any RLS policy
-- added later. Restrict to the service role.
REVOKE ALL ON FUNCTION public.get_mailbox_folder_counts(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_mailbox_folder_counts(UUID) TO service_role;


-- ── Empty trash, honouring a retention window ─────────────────────
-- A hard delete, so it is not exposed to the browser: the client calls this
-- through the service role, never with the anon key.
CREATE OR REPLACE FUNCTION public.empty_mailbox_trash(
  p_alias_id UUID,
  p_older_than_days INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed INTEGER := 0;
BEGIN
  IF p_older_than_days < 0 THEN
    RAISE EXCEPTION 'p_older_than_days must not be negative';
  END IF;

  WITH deleted AS (
    DELETE FROM public.email_inbound
     WHERE alias_id = p_alias_id
       AND deleted_at IS NOT NULL
       AND deleted_at < now() - make_interval(days => p_older_than_days)
    RETURNING 1
  )
  SELECT count(*) INTO removed FROM deleted;

  RETURN removed;
END;
$$;

COMMENT ON FUNCTION public.empty_mailbox_trash(UUID, INTEGER) IS
  'Permanently deletes messages in trash older than the retention window. Returns the row count.';

-- Same reasoning as above, and this one hard-deletes rows: leaving it callable
-- by anon would let anyone purge another alias's trash by passing its id.
REVOKE ALL ON FUNCTION public.empty_mailbox_trash(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.empty_mailbox_trash(UUID, INTEGER) TO service_role;

COMMIT;

-- ============================================================================
-- VERIFY
--   SELECT * FROM public.get_mailbox_folder_colors('<alias uuid>');
-- ============================================================================

-- ---------------------------------------------------------------------------
-- RLS REMINDER
-- These columns are only safe once the RLS policies in
-- 20260501_enable_rls_email_tables.sql are active. Until then, any client
-- holding the anon key can still read and change every folder.
-- ---------------------------------------------------------------------------