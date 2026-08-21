-- DEV-1134: make the existing public-schema Data API surface explicit.
-- Grants decide whether a role can reach a relation; RLS then constrains rows.

DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT relation.oid::regclass AS relation_name
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relkind IN ('r', 'p', 'v', 'm')
  LOOP
    EXECUTE pg_catalog.format(
      'REVOKE ALL ON TABLE %s FROM PUBLIC, anon, authenticated',
      target.relation_name
    );
  END LOOP;
END;
$$;

-- Public, read-only configuration and category catalog.
GRANT SELECT ON TABLE public.app_config TO anon, authenticated;
GRANT SELECT ON TABLE public.system_categories TO anon, authenticated;

-- Public waitlist intake remains available, but existing addresses and
-- metadata are never readable through the Data API.
GRANT INSERT ON TABLE public.waitlist TO anon, authenticated;

-- Authenticated app relations. These grants preserve the installed client
-- contract while their policies continue to enforce ownership.
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT ON TABLE public.beta_feedback TO authenticated;
GRANT SELECT, INSERT ON TABLE public.support_requests TO authenticated;
GRANT SELECT ON TABLE public.purchase_refund_states TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.task_time_blocks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_category_preferences TO authenticated;

-- Private operational, PII, audit, and webhook paths are service-only.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.waitlist TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.email_templates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.email_campaigns TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.campaign_recipients TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.email_unsubscribes TO service_role;
GRANT SELECT, INSERT ON TABLE public.admin_audit_log TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.revenuecat_webhook_events TO service_role;

-- Preserve the current RevenueCat Edge Function's direct service-role paths.
GRANT SELECT, UPDATE ON TABLE public.profiles TO service_role;
GRANT SELECT ON TABLE public.promo_redemption_attempts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.purchase_refund_states TO service_role;

-- Every base table in the exposed public schema remains protected by RLS,
-- including service-only tables as defense in depth.
DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT relation.oid::regclass AS relation_name
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relkind IN ('r', 'p')
  LOOP
    EXECUTE pg_catalog.format(
      'ALTER TABLE %s ENABLE ROW LEVEL SECURITY',
      target.relation_name
    );
  END LOOP;
END;
$$;

-- Restrict policy targets to the roles that actually own each client path.
ALTER POLICY "Anyone can read app config" ON public.app_config
TO anon, authenticated
USING (true);

ALTER POLICY "Anyone can view system categories" ON public.system_categories
TO anon, authenticated
USING (true);

ALTER POLICY "Enable insert for all users" ON public.waitlist
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users"
ON public.waitlist;

DROP POLICY IF EXISTS "Public can unsubscribe"
ON public.email_unsubscribes;

DROP POLICY IF EXISTS "System can insert audit logs"
ON public.admin_audit_log;

ALTER POLICY "System can manage sessions" ON public.admin_sessions
TO service_role
USING (true)
WITH CHECK (true);

ALTER POLICY "Users can create their own feedback" ON public.beta_feedback
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can view their own feedback" ON public.beta_feedback
TO authenticated
USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can create their own support requests" ON public.support_requests
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can view their own support requests" ON public.support_requests
TO authenticated
USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can view their own purchase refund state"
ON public.purchase_refund_states
TO authenticated
USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can insert own profile" ON public.profiles
TO authenticated
WITH CHECK ((SELECT auth.uid()) = id);

ALTER POLICY "Users can read own profile" ON public.profiles
TO authenticated
USING ((SELECT auth.uid()) = id);

ALTER POLICY "Users can update own profile" ON public.profiles
TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);

ALTER POLICY "Users can view own tasks" ON public.tasks
TO authenticated
USING (user_id = (SELECT auth.uid()));

ALTER POLICY "Users can insert tasks" ON public.tasks
TO authenticated;

ALTER POLICY "Users can update own tasks" ON public.tasks
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY "Users can delete own tasks" ON public.tasks
TO authenticated
USING (user_id = (SELECT auth.uid()));

ALTER POLICY "Users can read own task time blocks" ON public.task_time_blocks
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks
    WHERE tasks.id = task_time_blocks.task_id
      AND tasks.user_id = (SELECT auth.uid())
  )
);

ALTER POLICY "Users can create task time blocks" ON public.task_time_blocks
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tasks
    WHERE tasks.id = task_time_blocks.task_id
      AND tasks.user_id = (SELECT auth.uid())
  )
);

ALTER POLICY "Users can update task time blocks" ON public.task_time_blocks
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks
    WHERE tasks.id = task_time_blocks.task_id
      AND tasks.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tasks
    WHERE tasks.id = task_time_blocks.task_id
      AND tasks.user_id = (SELECT auth.uid())
  )
);

ALTER POLICY "Users can delete task time blocks" ON public.task_time_blocks
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks
    WHERE tasks.id = task_time_blocks.task_id
      AND tasks.user_id = (SELECT auth.uid())
  )
);

ALTER POLICY "Users can view own categories" ON public.user_categories
TO authenticated
USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can insert own categories" ON public.user_categories
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can update own categories" ON public.user_categories
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can delete own categories" ON public.user_categories
TO authenticated
USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can view own category preferences"
ON public.user_category_preferences
TO authenticated
USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can insert own category preferences"
ON public.user_category_preferences
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can update own category preferences"
ON public.user_category_preferences
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can delete own category preferences"
ON public.user_category_preferences
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- The reporting view stays RLS-aware. Grant only the two auth columns its
-- service-only definition needs instead of exposing auth.users wholesale.
ALTER VIEW public.profiles_dashboard SET (security_invoker = true);
REVOKE ALL ON TABLE public.profiles_dashboard FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.profiles_dashboard TO service_role;
GRANT SELECT (id, last_sign_in_at) ON TABLE auth.users TO service_role;

COMMENT ON TABLE public.waitlist IS
'Public intake is insert-only; reads and administration require service_role.';
COMMENT ON TABLE public.email_unsubscribes IS
'Email suppression writes require a verified service path; direct client writes are denied.';
COMMENT ON TABLE public.admin_audit_log IS
'Operational audit records are append/read-only through trusted service paths.';

NOTIFY pgrst, 'reload schema';
