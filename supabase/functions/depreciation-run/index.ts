import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DepreciationProfile {
  id: string;
  tenant_id: number;
  asset_id: number;
  method_id: string;
  cost_basis: number;
  salvage_value: number;
  useful_life_years: number;
  useful_life_periods: number;
  depreciation_start_date: string;
  frequency: string;
  prorate_first_period: boolean;
  prorate_last_period: boolean;
  switch_to_sl_threshold: boolean;
}

interface DepreciationMethod {
  code: string;
  parameters: any;
}

// Calculate depreciation for a period
function calculateDepreciation(
  profile: DepreciationProfile,
  method: DepreciationMethod,
  periodNumber: number,
  currentAccumulated: number
): number {
  const depreciableAmount = profile.cost_basis - profile.salvage_value;
  
  switch (method.code) {
    case 'SL': {
      // Straight Line
      return depreciableAmount / profile.useful_life_periods;
    }
    
    case 'DB':
    case 'DDB': {
      // Declining Balance
      const factor = method.parameters?.factor || 2.0;
      const rate = factor / profile.useful_life_years;
      const bookValue = profile.cost_basis - currentAccumulated;
      const depreciation = bookValue * rate;
      
      // Don't depreciate below salvage
      return Math.min(depreciation, bookValue - profile.salvage_value);
    }
    
    case 'SYD': {
      // Sum of Years Digits
      const totalYears = profile.useful_life_years;
      const sumOfYears = (totalYears * (totalYears + 1)) / 2;
      const yearNumber = Math.floor(periodNumber / (profile.useful_life_periods / profile.useful_life_years)) + 1;
      const remainingYears = totalYears - yearNumber + 1;
      
      return (depreciableAmount * remainingYears) / sumOfYears / (profile.useful_life_periods / profile.useful_life_years);
    }
    
    default:
      return 0;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tenantId, dryRun = false } = await req.json();

    console.log(`Starting depreciation run for tenant ${tenantId}, dryRun: ${dryRun}`);

    // Get current period dates
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Fetch active depreciation profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('asset_depreciation_profiles')
      .select('*, depreciation_methods(*), itam_assets(*)')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('is_deleted', false);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} active profiles`);

    const entries = [];
    const errors = [];

    for (const profile of profiles || []) {
      try {
        // Get current accumulated depreciation
        const { data: lastEntry } = await supabase
          .from('depreciation_entries')
          .select('accumulated_depreciation')
          .eq('profile_id', profile.id)
          .order('period_end', { ascending: false })
          .limit(1)
          .single();

        const currentAccumulated = lastEntry?.accumulated_depreciation || 0;
        const currentBookValue = profile.cost_basis - currentAccumulated;

        // Skip if fully depreciated
        if (currentBookValue <= profile.salvage_value) {
          console.log(`Asset ${profile.asset_id} fully depreciated, skipping`);
          continue;
        }

        // Calculate period depreciation
        const periodDepreciation = calculateDepreciation(
          profile,
          profile.depreciation_methods,
          Math.floor((now.getTime() - new Date(profile.depreciation_start_date).getTime()) / (1000 * 60 * 60 * 24 * 30)),
          currentAccumulated
        );

        const newAccumulated = currentAccumulated + periodDepreciation;
        const newBookValue = profile.cost_basis - newAccumulated;

        // Cap at salvage value
        const finalDepreciation = Math.min(periodDepreciation, currentBookValue - profile.salvage_value);
        const finalAccumulated = Math.min(newAccumulated, profile.cost_basis - profile.salvage_value);
        const finalBookValue = Math.max(newBookValue, profile.salvage_value);

        entries.push({
          tenant_id: tenantId,
          profile_id: profile.id,
          asset_id: profile.asset_id,
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          depreciation_amount: Math.round(finalDepreciation * 100) / 100,
          accumulated_depreciation: Math.round(finalAccumulated * 100) / 100,
          book_value: Math.round(finalBookValue * 100) / 100,
          entry_type: 'normal',
          posted: !dryRun,
        });

        console.log(`Calculated depreciation for asset ${profile.asset_id}: ${finalDepreciation}`);
      } catch (error: any) {
        console.error(`Error processing profile ${profile.id}:`, error);
        errors.push({
          profile_id: profile.id,
          asset_id: profile.asset_id,
          error: error.message,
        });
      }
    }

    if (dryRun) {
      return new Response(
        JSON.stringify({ preview: entries, errors }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert depreciation entries
    if (entries.length > 0) {
      const { error: insertError } = await supabase
        .from('depreciation_entries')
        .insert(entries);

      if (insertError) {
        console.error('Error inserting entries:', insertError);
        throw insertError;
      }

      // Update assets with new accumulated depreciation and book values
      for (const entry of entries) {
        await supabase
          .from('itam_assets')
          .update({
            accumulated_depreciation: entry.accumulated_depreciation,
            book_value: entry.book_value,
            depreciation_status: entry.book_value <= entry.accumulated_depreciation ? 'fully_depreciated' : 'active',
          })
          .eq('id', entry.asset_id);
      }
    }

    // Log the run
    await supabase.from('depreciation_run_logs').insert({
      tenant_id: tenantId,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      status: errors.length === 0 ? 'success' : 'partial_success',
      entries_created: entries.length,
      errors: errors,
    });

    console.log(`Depreciation run complete. Created ${entries.length} entries with ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        entriesCreated: entries.length,
        errors: errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Depreciation run failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
