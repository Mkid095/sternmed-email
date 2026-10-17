-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON THE EMAIL TABLES
-- ============================================================================
-- WHY THIS FILE IS NOT SAFE TO RUN YET
--
-- The email tables currently have RLS DISABLED, and `email_alias_limits` was
-- explicitly disabled in 20250311 with the justification that "app validates
-- alias ownership via outbound service". That justification does not hold: the
-- outbound service is browser code, so it validates nothing. With RLS off,
-- anyone holding the public anon key can read and write every row.
--
-- Enabling RLS is only safe once Supabase can identify the caller. Today the
-- app authenticates with FIREBASE and talks to Supabase with the ANON KEY and
-- no Supabase session, so Supabase sees every request as `anon`. If you enable
-- RLS before bridging that, every query returns zero rows and the mailbox
-- appears empty (the 401/406 errors that led to RLS being switched off in the
-- first place).
--
-- REQUIRED PREREQUISITE — pick ONE:
--
--   Option A (recommended): route data access through a Supabase Edge Function
--     that verifies the Firebase ID token and queries with the service role,
--     scoping every query to the caller's alias_id. No RLS change needed then;
--     revoke the anon grants instead (see REVOKE SECTION).
--
--   Option B: bridge Firebase -> Supabase sessions so each request carries a
--     JWT, then use the policies below.
--
-- DO NOT run this file until one of those is in place. To inspect the current
-- state without changing anything, run the queries in AUDIT SECTION.
-- ============================================================================


-- ── AUDIT: current exposure ───────────────────────────────────────────────
-- Run this first. `has_table_privilege('anon', ...)` shows whether the public
-- anon role can still reach the table directly.
--
--   SELECT c.relname,
--          c.relrowsecurity                       AS rls_enabled,
--          has_table_privilege('anon', c.oid, 'SELECT') AS anon_can_select,
--          has_table_privilege('anon', c.oid, 'INSERT') AS anon_can_insert,
--          has_table_privilege('anon', c.oid, 'UPDATE') AS anon_can_update,
--          has_table_privilege('anon', c.oid, 'DELETE') AS anon_can_delete
--     FROM pg_class c
--     JOIN pg_namespace n ON n.oid = c.relnamespace
--    WHERE n.nspname = 'public'
--      AND c.relname IN ('email_inbound','email_outbound','email_aliases',
--                         'email_alias_limits','email_templates','email_logs',
--                         'email_drafts','users');


-- ============================================================================
-- SECTION 1 — Reverse the blanket grants
-- ============================================================================
-- 20250227_rls_firebase_compat.sql granted ALL to anon with USING (true).
-- Remove those grants; they defeat any policy we add below.
-- ============================================================================

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'email_inbound', 'email_outbound', 'email_aliases',
    'email_alias_limits', 'email_templates', 'email_logs', 'email_drafts'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
      EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', t);
      RAISE NOTICE 'Revoked anon/authenticated grants on %', t;
    ELSE
      RAISE NOTICE 'SKIP % — table does not exist in this database', t;
    END IF;
  END LOOP;
END $$;

-- The edge function / worker holds the service role and bypasses RLS, which is
-- how inbound mail keeps working (it writes via SUPABASE_SERVICE_ROLE_KEY).
GRANT ALL ON public.email_inbound TO service_role;
GRANT ALL ON public.email_outbound TO service_role;
GRANT ALL ON public.email_alias_limits TO service_role;


-- ============================================================================
-- SECTION 2 — Enable RLS and define policies
-- ============================================================================
-- Only run this section if you have completed Option A or Option B above.
-- Policies key off `firebase_uid` from the signed JWT claims. With Option B the
-- JWT `sub` carries the Firebase uid; with Option A these policies are a
-- defence-in-depth backstop for any direct client access.
-- ============================================================================

-- Helper: the firebase uid of the caller, or NULL when unauthenticated.
CREATE OR REPLACE FUNCTION public.current_firebase_uid()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nullif(
    current_setting('request.jwt.claims', true)::json ->> 'sub',
    ''
  )
$$;

COMMENT ON FUNCTION public.current_firebase_uid() IS
  'Firebase uid of the current caller from the verified JWT, or NULL.';

-- Helper: true when the caller is an admin.
CREATE OR REPLACE FUNCTION public.is_mailbox_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.users u
     WHERE u.firebase_uid = public.current_firebase_uid()
       AND u.role IN ('admin', 'staff')
  )
$$;


-- ── Scoping helper used by the table policies ─────────────────────────────
-- Returns the alias the caller may read/write, or NULL when they have none.
CREATE OR REPLACE FUNCTION public.caller_alias_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email_alias_id
    FROM public.users u
   WHERE u.firebase_uid = public.current_firebase_uid()
$$;


DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['email_inbound','email_outbound','email_drafts'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'SKIP % — table does not exist', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);

    -- Drop any permissive policy left over from the compat migration.
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow all operations on ' || t, t);

    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR SELECT
        USING (
          alias_id = public.caller_alias_id()
          OR public.is_mailbox_admin()
        )
    $f$, 'email_select_own_alias_' || t, t);

    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR UPDATE
        USING (alias_id = public.caller_alias_id() OR public.is_mailbox_admin())
        WITH CHECK (alias_id = public.caller_alias_id() OR public.is_mailbox_admin())
    $f$, 'email_update_own_alias_' || t, t);

    -- Deletion is a soft delete (deleted_at), routed through UPDATE.
    -- Hard DELETE is intentionally not granted to clients.
    RAISE NOTICE 'RLS enabled on %', t;
  END LOOP;
END $$;


-- email_aliases: a user may read the alias they own; only admins may change it.
DO $$
BEGIN
  IF to_regclass('public.email_aliases') IS NOT NULL THEN
    ALTER TABLE public.email_aliases ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow all operations on email_aliases" ON public.email_aliases;

    CREATE POLICY email_aliases_select_own ON public.email_aliases
      FOR SELECT
      USING (
        id = public.caller_alias_id()
        OR public.is_mailbox_admin()
      );

    -- Creation and deactivation are administrative.
    CREATE POLICY email_aliases_admin_write ON public.email_aliases
      FOR ALL
      USING (public.is_mailbox_admin())
      WITH CHECK (public.is_mailbox_admin());
  END IF;
END $$;


-- users: read your own row; admins read all. No client-side writes.
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow all operations on users" ON public.users;

    CREATE POLICY users_select_own ON public.users
      FOR SELECT
      USING (
        firebase_uid = public.current_firebase_uid()
        OR public.is_mailbox_admin()
      );
  END IF;
END $$;


-- email_alias_limits: readable for the UI, writable only by the service role
-- (the send path increments counters server-side, never the browser).
DO $$
BEGIN
  IF to_regclass('public.email_alias_limits') IS NOT NULL THEN
    ALTER TABLE public.email_alias_limits ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow all operations on email_alias_limits" ON public.email_alias_limits;

    CREATE POLICY email_alias_limits_select_own ON public.email_alias_limits
      FOR SELECT
      USING (alias_id = public.caller_alias_id() OR public.is_mailbox_admin());
  END IF;
END $$;


-- ============================================================================
-- SECTION 3 — Verify
-- ============================================================================
-- Re-run the AUDIT query. Expected: anon_can_select = false on every email
-- table, rls_enabled = true.
--
-- Then confirm the app still works for a signed-in user, and that a signed-out
-- request returns zero rows.
-- ============================================================================