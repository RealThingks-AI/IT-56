import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeviceUpdatePayload {
  hostname: string;
  serial_number?: string;
  os_version: string;
  os_build?: string;
  last_boot_time?: string;
  ip_address?: string;
  pending_updates: Array<{
    kb_number: string;
    title: string;
    severity?: string;
    size_mb?: number;
  }>;
  installed_updates: Array<{
    kb_number: string;
    title: string;
    installed_date: string;
  }>;
  failed_updates?: Array<{
    kb_number: string;
    title: string;
    error_code?: string;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Device Update Ingest Request ===');
    
    const authHeader = req.headers.get('Authorization');
    const apiKey = Deno.env.get('DEVICE_AGENT_API_KEY');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const providedKey = authHeader.replace('Bearer ', '');
    if (providedKey !== apiKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: DeviceUpdatePayload = await req.json();

    if (!payload.hostname || !payload.os_version) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: hostname and os_version' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing update data for device: ${payload.hostname}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const hasCriticalPending = payload.pending_updates.some(
      u => u.severity?.toLowerCase() === 'critical'
    );
    const hasFailedUpdates = (payload.failed_updates?.length || 0) > 0;
    const complianceStatus = hasCriticalPending || hasFailedUpdates ? 'non-compliant' : 'compliant';

    // Find existing device by hostname
    const { data: existingDevices } = await supabase
      .from('system_devices')
      .select('*')
      .eq('device_name', payload.hostname)
      .limit(1);

    let deviceId: string;

    if (existingDevices && existingDevices.length > 0) {
      const { data: updatedDevice, error: updateError } = await supabase
        .from('system_devices')
        .update({
          os_version: payload.os_version,
          os_build: payload.os_build || null,
          last_seen: new Date().toISOString(),
          last_update_scan: new Date().toISOString(),
          update_compliance_status: complianceStatus,
          pending_critical_count: payload.pending_updates.filter(u => u.severity?.toLowerCase() === 'critical').length,
          pending_total_count: payload.pending_updates.length,
          failed_updates_count: payload.failed_updates?.length || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingDevices[0].id)
        .select()
        .single();

      if (updateError) throw updateError;
      deviceId = updatedDevice.id;
    } else {
      const { data: newDevice, error: insertError } = await supabase
        .from('system_devices')
        .insert({
          device_name: payload.hostname,
          device_uuid: payload.serial_number || payload.hostname,
          os_type: 'Windows',
          os_version: payload.os_version,
          os_build: payload.os_build || null,
          last_seen: new Date().toISOString(),
          last_update_scan: new Date().toISOString(),
          update_compliance_status: complianceStatus,
          pending_critical_count: payload.pending_updates.filter(u => u.severity?.toLowerCase() === 'critical').length,
          pending_total_count: payload.pending_updates.length,
          failed_updates_count: payload.failed_updates?.length || 0,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      deviceId = newDevice.id;
    }

    // Log updates
    const updateEntries = [];

    for (const update of payload.pending_updates) {
      updateEntries.push({
        device_id: deviceId,
        kb_number: update.kb_number,
        title: update.title,
        severity: update.severity || 'Unknown',
        status: 'pending',
        detected_date: new Date().toISOString(),
      });
    }

    if (payload.failed_updates) {
      for (const update of payload.failed_updates) {
        updateEntries.push({
          device_id: deviceId,
          kb_number: update.kb_number,
          title: update.title,
          status: 'failed',
          detected_date: new Date().toISOString(),
        });
      }
    }

    for (const update of payload.installed_updates.slice(0, 10)) {
      updateEntries.push({
        device_id: deviceId,
        kb_number: update.kb_number,
        title: update.title,
        status: 'installed',
        installed_date: update.installed_date,
        detected_date: new Date().toISOString(),
      });
    }

    if (updateEntries.length > 0) {
      const { error: updatesError } = await supabase
        .from('system_updates')
        .upsert(updateEntries, {
          onConflict: 'device_id,kb_number',
          ignoreDuplicates: false,
        });

      if (updatesError) {
        console.error('Error logging updates:', updatesError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        device_id: deviceId,
        hostname: payload.hostname,
        compliance_status: complianceStatus,
        updates_processed: updateEntries.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ingest-device-updates function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
