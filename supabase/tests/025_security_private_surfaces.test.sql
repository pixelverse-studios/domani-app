BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(17);

SET LOCAL ROLE anon;

SELECT lives_ok(
  $$INSERT INTO public.waitlist (email) VALUES ('anon-intake@security.test')$$,
  'anonymous clients retain insert-only waitlist intake'
);

SELECT throws_ok(
  $$SELECT count(*) FROM public.waitlist$$,
  '42501',
  'permission denied for table waitlist',
  'anonymous clients cannot read waitlist PII'
);

SELECT throws_ok(
  $$INSERT INTO public.email_unsubscribes (email) VALUES ('anon@security.test')$$,
  '42501',
  'permission denied for table email_unsubscribes',
  'anonymous clients cannot write email suppression records'
);

SELECT throws_ok(
  $$
    INSERT INTO public.admin_audit_log (action, resource_type)
    VALUES ('create'::public.audit_action, 'security_test')
  $$,
  '42501',
  'permission denied for table admin_audit_log',
  'anonymous clients cannot forge audit records'
);

SELECT throws_ok(
  $$SELECT count(*) FROM public.profiles_dashboard$$,
  '42501',
  'permission denied for view profiles_dashboard',
  'anonymous clients cannot read the private profile report'
);

SELECT throws_ok(
  $$SELECT count(*) FROM public.revenuecat_webhook_events$$,
  '42501',
  'permission denied for table revenuecat_webhook_events',
  'anonymous clients cannot read webhook data'
);

RESET ROLE;
SELECT security_tests.authenticate_as('private_surface_user');
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$INSERT INTO public.waitlist (email) VALUES ('authenticated-intake@security.test')$$,
  'authenticated clients retain insert-only waitlist intake'
);

SELECT throws_ok(
  $$SELECT count(*) FROM public.waitlist$$,
  '42501',
  'permission denied for table waitlist',
  'authenticated clients cannot read waitlist PII'
);

SELECT throws_ok(
  $$INSERT INTO public.email_unsubscribes (email) VALUES ('authenticated@security.test')$$,
  '42501',
  'permission denied for table email_unsubscribes',
  'authenticated clients cannot write email suppression records'
);

SELECT throws_ok(
  $$
    INSERT INTO public.admin_audit_log (action, resource_type)
    VALUES ('create'::public.audit_action, 'security_test')
  $$,
  '42501',
  'permission denied for table admin_audit_log',
  'authenticated clients cannot forge audit records'
);

SELECT throws_ok(
  $$SELECT count(*) FROM public.profiles_dashboard$$,
  '42501',
  'permission denied for view profiles_dashboard',
  'authenticated clients cannot read the private profile report'
);

SELECT throws_ok(
  $$SELECT count(*) FROM public.revenuecat_webhook_events$$,
  '42501',
  'permission denied for table revenuecat_webhook_events',
  'authenticated clients cannot read webhook data'
);

RESET ROLE;
SET LOCAL ROLE service_role;

SELECT lives_ok(
  $$SELECT count(*) FROM public.profiles_dashboard$$,
  'service role can execute the least-privilege profile report'
);

SELECT lives_ok(
  $$
    INSERT INTO public.revenuecat_webhook_events (
      event_id,
      event_type,
      processed_action,
      raw_event
    ) VALUES (
      'security-test-event',
      'TEST',
      'ignored_test',
      '{}'::jsonb
    )
  $$,
  'service role can insert webhook events'
);

SELECT lives_ok(
  $$
    UPDATE public.revenuecat_webhook_events
    SET processed_action = 'ignored_test_updated'
    WHERE event_id = 'security-test-event'
  $$,
  'service role can update webhook events'
);

SELECT lives_ok(
  $$
    INSERT INTO public.admin_audit_log (action, resource_type)
    VALUES ('create'::public.audit_action, 'security_test')
  $$,
  'service role can append trusted audit records'
);

SELECT lives_ok(
  $$INSERT INTO public.email_unsubscribes (email) VALUES ('service@security.test')$$,
  'service role can write verified email suppression records'
);

SELECT * FROM finish();
ROLLBACK;
