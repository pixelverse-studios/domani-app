-- The first DEV-1135 staging application exposed that COALESCE is SQL syntax,
-- not a schema-qualifiable pg_catalog function. Future clean replays already
-- receive corrected definitions in the source migration; this idempotent
-- follow-up repairs environments where that migration was applied earlier.
DO $$
DECLARE
  v_signature text;
  v_definition text;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.ensure_profile_exists_for_auth_user(uuid)',
    'public.confirm_current_user_promo_redemption(uuid,uuid,uuid,text,text,text)',
    'public.apply_verified_revenuecat_lifetime_access(uuid,timestamp with time zone,text,uuid,uuid,uuid)'
  ]
  LOOP
    SELECT pg_catalog.pg_get_functiondef(v_signature::regprocedure)
    INTO v_definition;

    IF pg_catalog.strpos(v_definition, 'pg_catalog.coalesce') > 0 THEN
      EXECUTE pg_catalog.replace(
        v_definition,
        'pg_catalog.coalesce',
        'coalesce'
      );
    END IF;
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
