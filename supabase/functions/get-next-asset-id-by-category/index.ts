import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    const { category_id } = await req.json();

    if (!category_id) {
      return new Response(
        JSON.stringify({ error: 'Category ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get category tag format configuration
    const { data: tagFormat, error: tagError } = await supabaseClient
      .from('category_tag_formats')
      .select('prefix, current_number, zero_padding')
      .eq('category_id', category_id)
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

    const prefix = tagFormat.prefix;
    const paddingLength = tagFormat.zero_padding || 2;

    // Fetch ALL asset tags for this prefix (active + inactive) to find the highest number
    const { data: existingAssets, error: queryError } = await supabaseClient
      .from('itam_assets')
      .select('asset_tag')
      .like('asset_tag', `${prefix}%`);

    if (queryError) {
      console.error('Error querying existing assets:', queryError);
      return new Response(
        JSON.stringify({ error: 'Failed to query existing assets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the highest used number across ALL assets (active and inactive)
    let maxNumber = 0;
    if (existingAssets && existingAssets.length > 0) {
      for (const asset of existingAssets) {
        const tag = asset.asset_tag;
        if (tag && tag.startsWith(prefix)) {
          const numPart = tag.substring(prefix.length);
          const num = parseInt(numPart, 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }

    // Always use highest number + 1 (no gap filling, no tag reuse)
    const nextNumber = maxNumber + 1;
    const paddedNumber = nextNumber.toString().padStart(paddingLength, '0');
    const nextAssetId = `${prefix}${paddedNumber}`;

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
