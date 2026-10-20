-- Installed-schema contract, not an HTTP/JWT or device purchase test.
-- Fresh random accounts and all changes live in one transaction, rolled back
-- on success or connection close. No existing account is selected or changed.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
CREATE TEMP TABLE dev_1422_accounts (scenario text PRIMARY KEY, id uuid NOT NULL, baseline jsonb);
INSERT INTO dev_1422_accounts (scenario, id) VALUES
  ('direct', gen_random_uuid()), ('rpc', gen_random_uuid()), ('current', gen_random_uuid());
GRANT SELECT ON dev_1422_accounts TO authenticated, service_role;
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
SELECT id, 'dev-1422-' || id || '@example.invalid', '{}'::jsonb, '{}'::jsonb, now(), now()
FROM dev_1422_accounts;
-- Sign-up behavior is tested separately on devices; force a known pre-trial
-- baseline without disabling production triggers or changing shared settings.
INSERT INTO public.profiles (id, email, tier)
SELECT id, 'dev-1422-' || id || '@example.invalid', 'none'::public.tier FROM dev_1422_accounts
ON CONFLICT (id) DO UPDATE SET tier = 'none', trial_started_at = NULL,
  trial_ends_at = NULL, purchased_at = NULL, refunded_at = NULL,
  revenuecat_user_id = NULL, is_admin = false;
DELETE FROM public.posthog_trial_event_deliveries
WHERE user_id IN (SELECT id FROM dev_1422_accounts);

SELECT set_config('request.jwt.claim.sub', id::text, true) FROM dev_1422_accounts WHERE scenario = 'direct';
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', id, 'role', 'authenticated')::text, true)
FROM dev_1422_accounts WHERE scenario = 'direct';
SET LOCAL ROLE authenticated;
-- Released 1.1.1 request shape, deliberately hostile client dates.
UPDATE public.profiles SET tier = 'trialing', trial_started_at = '2000-01-01', trial_ends_at = '2999-01-01'
WHERE id = auth.uid();
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND tier = 'trialing'
      AND trial_started_at = now() AND trial_ends_at = now() + interval '14 days') THEN
    RAISE EXCEPTION '1.1.1 direct trial did not return canonical server dates';
  END IF;
END $$;
RESET ROLE;
UPDATE dev_1422_accounts a SET baseline = to_jsonb(p) FROM public.profiles p WHERE p.id = a.id;
SET LOCAL ROLE authenticated;
-- Trial reuse/extension, paid access, refund clearing, identity and admin forgery.
UPDATE public.profiles SET tier = 'lifetime', trial_started_at = NULL,
  trial_ends_at = '2999-01-01', purchased_at = now(), refunded_at = now(),
  revenuecat_user_id = 'forged', is_admin = true WHERE id = auth.uid();
UPDATE public.profiles SET tier = 'trialing', trial_started_at = now(), trial_ends_at = '2999-01-01'
WHERE id = auth.uid();
-- RLS may either filter this update or reject it; either outcome must preserve victim state.
DO $$ BEGIN
  BEGIN
    UPDATE public.profiles SET tier = 'lifetime', is_admin = true
    WHERE id = (SELECT id FROM dev_1422_accounts WHERE scenario = 'rpc');
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.get_user_tier((SELECT id FROM dev_1422_accounts WHERE scenario = 'rpc'));
    RAISE EXCEPTION 'cross-user UUID RPC succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
DO $$ DECLARE field text; BEGIN
  FOREACH field IN ARRAY ARRAY['tier','trial_started_at','trial_ends_at','purchased_at','refunded_at','revenuecat_user_id','is_admin'] LOOP
    IF EXISTS (SELECT 1 FROM dev_1422_accounts a JOIN public.profiles p ON p.id = a.id
      WHERE to_jsonb(p)->field IS DISTINCT FROM a.baseline->field) THEN
      RAISE EXCEPTION 'forged authority write changed %', field;
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM public.revenuecat_access_reconciliation_requests
      WHERE user_id = (SELECT id FROM dev_1422_accounts WHERE scenario = 'direct')) <> 1 THEN
    RAISE EXCEPTION 'legacy purchase attempts did not coalesce into one private request';
  END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', id::text, true) FROM dev_1422_accounts WHERE scenario = 'rpc';
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', id, 'role', 'authenticated')::text, true)
FROM dev_1422_accounts WHERE scenario = 'rpc';
SET LOCAL ROLE authenticated;
-- Exact no-argument 1.1.3 trial RPC; repeat must reject rather than extend.
DO $$ DECLARE result jsonb; rejected boolean := false; BEGIN
  result := public.start_trial_with_posthog_outbox();
  IF result->>'id' <> auth.uid()::text OR result->>'tier' <> 'trialing' THEN
    RAISE EXCEPTION '1.1.3 RPC returned wrong profile';
  END IF;
  BEGIN PERFORM public.start_trial_with_posthog_outbox();
  EXCEPTION WHEN raise_exception THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION '1.1.3 RPC reused trial'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.posthog_trial_event_deliveries
    WHERE user_id IN (SELECT id FROM dev_1422_accounts WHERE scenario IN ('direct','rpc'))) <> 2 THEN
    RAISE EXCEPTION 'released trial paths did not each produce exactly one analytics event';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', id::text, true) FROM dev_1422_accounts WHERE scenario = 'current';
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', id, 'role', 'authenticated')::text, true)
FROM dev_1422_accounts WHERE scenario = 'current';
SET LOCAL ROLE authenticated;
DO $$ DECLARE result jsonb; BEGIN
  BEGIN
    PERFORM public.start_current_user_trial((SELECT id FROM dev_1422_accounts WHERE scenario = 'rpc'));
    RAISE EXCEPTION 'expected-user mismatch accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  result := public.start_current_user_trial(auth.uid());
  IF result->>'id' <> auth.uid()::text OR result->>'tier' <> 'trialing' THEN
    RAISE EXCEPTION 'current expected-user trial RPC returned wrong profile';
  END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id =
    (SELECT id FROM dev_1422_accounts WHERE scenario = 'current')
    AND tier = 'trialing' AND trial_started_at = now() AND trial_ends_at = now() + interval '14 days') THEN
    RAISE EXCEPTION 'current trial did not receive canonical server dates';
  END IF;
END $$;

-- Fail closed if any intended private surface is exposed or missing.
DO $$ DECLARE role_name text; target text; privilege text; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    FOREACH target IN ARRAY ARRAY['profiles_dashboard','revenuecat_webhook_events',
      'revenuecat_access_reconciliation_requests','account_email_events','posthog_trial_event_deliveries'] LOOP
      FOREACH privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
        IF has_table_privilege(role_name, 'public.' || target, privilege) THEN
          RAISE EXCEPTION '% can % private surface %', role_name, privilege, target;
        END IF;
      END LOOP;
    END LOOP;
    FOREACH target IN ARRAY ARRAY[
      'apply_verified_revenuecat_lifetime_access(uuid,timestamptz,text,uuid,uuid,uuid,timestamptz)',
      'claim_pending_revenuecat_reconciliations(integer)',
      'claim_account_email_event(uuid,text,text)',
      'list_dashboard_domani_users(jsonb)',
      'pvs_domani_schema_contract_version()'] LOOP
      IF has_function_privilege(role_name, 'public.' || target, 'EXECUTE')
        OR NOT has_function_privilege('service_role', 'public.' || target, 'EXECUTE') THEN
        RAISE EXCEPTION 'incorrect service RPC boundary: %, %', role_name, target;
      END IF;
    END LOOP;
  END LOOP;
END $$;
SET LOCAL ROLE service_role;
DO $$ BEGIN
  -- Filter strictly to synthetic users; never enumerate real dashboard records.
  PERFORM count(*) FROM public.profiles_dashboard
    WHERE id IN (SELECT id FROM dev_1422_accounts);
  PERFORM public.pvs_domani_schema_contract_version();
  IF (public.apply_verified_revenuecat_lifetime_access(
    (SELECT id FROM dev_1422_accounts WHERE scenario = 'direct'), now(), 'domani_lifetime')->>'accessGranted')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'service verified purchase path failed';
  END IF;
END $$;
RESET ROLE;
ROLLBACK;
\echo 'DEV-1422 installed-schema released-client/authority contracts passed; synthetic changes rolled back'
