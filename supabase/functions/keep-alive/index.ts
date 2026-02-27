import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data, error } = await supabase.from('users').select('id').limit(1);

  return new Response(
    JSON.stringify({
      status: error ? 'error' : 'alive',
      timestamp: new Date().toISOString(),
      error: error?.message,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
