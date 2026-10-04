-- DEV-1555. Install the eligibility contract without activating new pricing.
-- The only activation path records one immutable timestamp and changes public
-- pricing in the same transaction. Do not call it until the rollout gates pass.

CREATE TABLE public.lifetime_pricing_cutover (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  cutover_at TIMESTAMPTZ NOT NULL,
  pre_cutover_account_count BIGINT NOT NULL CHECK (pre_cutover_account_count >= 0),
  activated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE public.lifetime_pricing_cutover ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lifetime_pricing_cutover FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.prevent_lifetime_pricing_cutover_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Lifetime pricing cutover is immutable';
END;
$$;

CREATE TRIGGER lifetime_pricing_cutover_immutable
BEFORE UPDATE OR DELETE ON public.lifetime_pricing_cutover
FOR EACH ROW EXECUTE FUNCTION public.prevent_lifetime_pricing_cutover_change();

REVOKE ALL ON FUNCTION public.prevent_lifetime_pricing_cutover_change() FROM PUBLIC, anon, authenticated;

-- Share a transaction lock with activation so every signup is wholly before
-- or after the cutover. A signup waiting for activation must not retain a
-- transaction-start created_at that predates the newly committed cutoff.
CREATE FUNCTION public.stamp_lifetime_pricing_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock_shared(1555, 1);

  IF EXISTS (SELECT 1 FROM public.lifetime_pricing_cutover WHERE singleton = TRUE) THEN
    NEW.created_at := clock_timestamp();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER stamp_lifetime_pricing_signup
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.stamp_lifetime_pricing_signup();

REVOKE ALL ON FUNCTION public.stamp_lifetime_pricing_signup() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.get_my_lifetime_pricing_offer(p_expected_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_created_at TIMESTAMPTZ;
  v_cutover_at TIMESTAMPTZ;
  v_public_tier TEXT;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR (SELECT auth.uid()) IS DISTINCT FROM p_expected_user_id THEN
    RETURN NULL;
  END IF;

  SELECT created_at INTO v_created_at
  FROM auth.users
  WHERE id = p_expected_user_id;

  IF v_created_at IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT cutover_at INTO v_cutover_at
  FROM public.lifetime_pricing_cutover
  WHERE singleton = TRUE;

  SELECT value->>'tier' INTO v_public_tier
  FROM public.app_config
  WHERE key = 'public_pricing';

  IF (v_cutover_at IS NULL AND v_public_tier IS DISTINCT FROM 'early_adopter')
    OR (v_cutover_at IS NOT NULL AND v_public_tier IS DISTINCT FROM 'standard') THEN
    RETURN NULL;
  END IF;

  IF v_cutover_at IS NULL OR v_created_at < v_cutover_at THEN
    RETURN 'early_adopter';
  END IF;

  RETURN 'general';
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_lifetime_pricing_offer(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_lifetime_pricing_offer(UUID) TO authenticated;

CREATE FUNCTION public.activate_lifetime_pricing_cutover()
RETURNS TABLE (cutover_at TIMESTAMPTZ, pre_cutover_account_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cutover_at TIMESTAMPTZ;
  v_count BIGINT;
  v_public_pricing JSONB;
BEGIN
  -- Existing signups hold the shared lock until commit. New signups wait here
  -- and receive a post-cutover created_at in the trigger after we commit.
  PERFORM pg_catalog.pg_advisory_xact_lock(1555, 1);

  SELECT value INTO v_public_pricing
  FROM public.app_config
  WHERE key = 'public_pricing'
  FOR UPDATE;

  IF v_public_pricing IS NULL OR v_public_pricing->>'tier' IS DISTINCT FROM 'early_adopter' THEN
    RAISE EXCEPTION 'Expected inactive early-adopter public pricing';
  END IF;

  IF EXISTS (SELECT 1 FROM public.lifetime_pricing_cutover WHERE singleton = TRUE) THEN
    RAISE EXCEPTION 'Lifetime pricing cutover already activated';
  END IF;

  v_cutover_at := clock_timestamp();
  SELECT count(*) INTO v_count FROM auth.users WHERE created_at < v_cutover_at;

  INSERT INTO public.lifetime_pricing_cutover
    (singleton, cutover_at, pre_cutover_account_count)
  VALUES (TRUE, v_cutover_at, v_count);

  UPDATE public.app_config
  SET value = jsonb_set(v_public_pricing, '{tier}', '"standard"'::jsonb),
      updated_at = clock_timestamp()
  WHERE key = 'public_pricing';

  RETURN QUERY SELECT v_cutover_at, v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_lifetime_pricing_cutover() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_lifetime_pricing_cutover() TO service_role;

COMMENT ON TABLE public.lifetime_pricing_cutover IS
'Immutable one-time 1.1.4 lifetime-price activation and pre-cutover account audit.';
COMMENT ON FUNCTION public.get_my_lifetime_pricing_offer(UUID) IS
'Returns the signed-in account''s server-verified RevenueCat offer, or null when unavailable.';
COMMENT ON FUNCTION public.activate_lifetime_pricing_cutover() IS
'Service-role-only one-time activation; records cutover and changes public price atomically.';
