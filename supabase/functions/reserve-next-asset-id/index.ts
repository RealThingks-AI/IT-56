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

    // Increment the current_number atomically
    const { data: tagFormat, error: updateError } = await supabaseClient
      .from('category_tag_formats')
      .update({ 
        current_number: supabaseClient.rpc('increment_category_tag_number', { 
          cat_id: category_id, 
          org_id: organisationId 
        }) 
      })
      .eq('category_id', category_id)
      .eq('organisation_id', organisationId)
      .select()
      .single();

    if (updateError) {
      console.error('Error reserving asset ID:', updateError);
      
      // Fallback: manual increment
      const { data: currentFormat } = await supabaseClient
        .from('category_tag_formats')
        .select('current_number')
        .eq('category_id', category_id)
        .eq('organisation_id', organisationId)
        .single();

      if (currentFormat) {
        await supabaseClient
          .from('category_tag_formats')
          .update({ current_number: currentFormat.current_number + 1 })
          .eq('category_id', category_id)
          .eq('organisation_id', organisationId);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in reserve-next-asset-id function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
