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

    // Get category_id from request body
    const { category_id } = await req.json();

    if (!category_id) {
      return new Response(
        JSON.stringify({ error: 'Category ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Get category tag format configuration
    const { data: tagFormat, error: tagError } = await supabaseClient
      .from('category_tag_formats')
      .select('prefix, current_number, zero_padding')
      .eq('category_id', category_id)
      .eq('organisation_id', organisationId)
      .maybeSingle();

    if (tagError) {
      console.error('Error fetching category tag format:', tagError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch category tag format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tagFormat) {
      return new Response(
        JSON.stringify({ 
          error: 'Tag Format not configured for this Category. Please configure it under Setup → Tag Format.',
          needsConfiguration: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate next asset ID and find unique one
    let currentNumber = tagFormat.current_number;
    const paddingLength = tagFormat.zero_padding || 2;
    let nextAssetId = '';
    let isUnique = false;
    const maxAttempts = 1000; // Prevent infinite loop
    let attempts = 0;

    // Keep incrementing until we find a unique ID
    while (!isUnique && attempts < maxAttempts) {
      const paddedNumber = currentNumber.toString().padStart(paddingLength, '0');
      nextAssetId = `${tagFormat.prefix}${paddedNumber}`;

      // Check if this ID exists
      const { data: existingAsset } = await supabaseClient
        .from('itam_assets')
        .select('id')
        .eq('asset_id', nextAssetId)
        .maybeSingle();

      if (!existingAsset) {
        isUnique = true;
      } else {
        currentNumber++;
        attempts++;
      }
    }

    if (!isUnique) {
      return new Response(
        JSON.stringify({ error: 'Could not generate unique asset ID after maximum attempts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ assetId: nextAssetId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-next-asset-id-by-category function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
