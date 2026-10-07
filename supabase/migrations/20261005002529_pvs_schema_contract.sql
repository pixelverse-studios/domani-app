-- The PVS API checks this contract before it starts serving requests. The
-- version is the latest Domani migration whose API-facing schema it requires.
-- Bump it in a later Domani migration whenever the server needs a newer shape.
CREATE FUNCTION public.pvs_domani_schema_contract_version()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT '20260920191655'::text;
$$;

REVOKE ALL ON FUNCTION public.pvs_domani_schema_contract_version()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pvs_domani_schema_contract_version()
  TO service_role;
