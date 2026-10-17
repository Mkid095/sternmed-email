-- ============================================================================
-- EMERGENCY: service-role key was publicly readable via email_logs
--
-- What happened
--   The inbound Cloudflare Worker logged the whole `env` object on every
--   rejected-domain message:
--     logToEmailLog('worker_error', 'Invalid domain', { recipient, domain, env }, env)
--   `env` includes SUPABASE_SERVICE_ROLE_KEY, so that JWT was persisted into
--   email_logs.metadata.
--
--   The table carried the policy "Allow all operations on email_logs" with
--   USING (true) / WITH CHECK (true) for role `public`. RLS was enabled but the
--   policy granted everything, so the Supabase ANON key could read the table.
--
--   The anon key ships in the frontend bundle (VITE_SUPABASE_ANON_KEY). That
--   made the service-role key recoverable by anyone with a browser:
--     curl "$SUPABASE_URL/rest/v1/email_logs?select=metadata" \
--          -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
--
-- Why it matters
--   The service role bypasses RLS entirely. Reading that key means full
--   read/write on the whole database, regardless of the RLS work below.
--
-- What this does
--   1. Scrubs the leaked rows (the diagnostic content of the logs is kept —
--      only the `env` object is removed).
--   2. Drops the blanket policies and revokes anon/authenticated entirely, so
--      the table is service-role only.
--
-- The worker logs with the service role, which bypasses RLS, so no permissive
-- policy is required. Nothing in the frontend reads email_logs.
--
-- FOLLOW-UP (not done here, needs operator action):
--   The key was publicly readable between 2026-02-27 and 2026-10-12. Treat it as
--   compromised and rotate it, then update:
--     * Vercel env (sternmed-email)
--     * the worker secret: npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
--     * local .env.local
-- ============================================================================

BEGIN;

-- ── 1. Scrub ────────────────────────────────────────────────────────────────
-- Remove the whole `env` object rather than just the key: it also carried
-- SUPABASE_URL and storage config, and leaving the shape intact invites the
-- same mistake later. Idempotent.
UPDATE public.email_logs
   SET metadata = metadata - 'env'
 WHERE metadata ? 'env';

-- ── 2. Remove the permissive policies ───────────────────────────────────────
DROP POLICY IF EXISTS "Allow all operations on email_logs" ON public.email_logs;
DROP POLICY IF EXISTS "Admins full access on email_logs"  ON public.email_logs;
DROP POLICY IF EXISTS "Service role can insert email logs" ON public.email_logs;

-- ── 3. Revoke table privileges ──────────────────────────────────────────────
-- RLS alone is policy-dependent; the grant is not. Revoking means PostgREST
-- has nothing to hand to anon regardless of policy correctness.
REVOKE ALL ON public.email_logs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.email_logs TO service_role;

COMMIT;

-- ============================================================================
-- VERIFY
--   -- Should return zero.
--   SELECT count(*) FROM public.email_logs WHERE metadata ? 'env';
--
--   -- Should be denied.
--   SELECT * FROM public.email_logs;               -- as anon/authenticated
-- ============================================================================