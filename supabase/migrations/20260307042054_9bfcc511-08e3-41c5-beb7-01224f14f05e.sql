CREATE OR REPLACE FUNCTION public.get_itam_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN json_build_object(
    'totalAssets', (SELECT count(*) FROM public.itam_assets WHERE is_active = true),
    'assigned', (SELECT count(*) FROM public.itam_asset_assignments WHERE returned_at IS NULL),
    'licenses', (SELECT count(*) FROM public.itam_licenses WHERE is_active = true)
  );
END;
$$;