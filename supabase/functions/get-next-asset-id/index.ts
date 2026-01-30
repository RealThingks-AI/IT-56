import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's organization
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select('organisation_id')
      .eq('auth_user_id', user.id)
      .single();

    if (userDataError || !userData?.organisation_id) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organisationId = userData.organisation_id;

    // Get tag format configuration
    const { data: tagFormat, error: tagError } = await supabaseClient
      .from('itam_tag_format')
      .select('prefix, start_number, padding_length')
      .eq('organisation_id', organisationId)
      .single();

    if (tagError) {
      console.error('Error fetching tag format:', tagError);
    }

    // Use defaults if no tag format is configured
    const prefix = tagFormat?.prefix || 'AS-';
    // Prefer start_number length, then padding_length, then default
    const paddingLength = (tagFormat?.start_number?.length ?? 0) || tagFormat?.padding_length || 4;

    const startNumberRaw = tagFormat?.start_number || '1';
    const parsedStart = parseInt(startNumberRaw, 10);
    const effectiveStart = Number.isNaN(parsedStart) ? 1 : parsedStart;
 
    // Call the database function to get the next number
    const { data: nextNumberData, error: nextNumberError } = await supabaseClient
      .rpc('get_next_asset_number', { p_organisation_id: organisationId });
 
    if (nextNumberError) {
      console.error('Error getting next asset number:', nextNumberError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate asset ID' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
 
    const rawNextNumber = typeof nextNumberData === 'number'
      ? nextNumberData
      : parseInt(String(nextNumberData ?? '0'), 10) || 1;
    const nextNumber = Math.max(rawNextNumber, effectiveStart);
    const paddedNumber = nextNumber.toString().padStart(paddingLength, '0');
    const nextAssetId = `${prefix}${paddedNumber}`;

    return new Response(
      JSON.stringify({ assetId: nextAssetId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-next-asset-id function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
