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
  organisation_id?: string;
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Device Update Ingest Request ===');
    
    // Validate API key
    const authHeader = req.headers.get('Authorization');
    const apiKey = Deno.env.get('DEVICE_AGENT_API_KEY');

    console.log('Authorization header present:', !!authHeader);
    console.log('API key configured:', !!apiKey);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const providedKey = authHeader.replace('Bearer ', '');
    if (providedKey !== apiKey) {
      console.error('Invalid API key provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('API key validated successfully');

    // Parse request body
    const payload: DeviceUpdatePayload = await req.json();
    console.log('Payload received:', JSON.stringify(payload, null, 2));

    // Validate required fields
    if (!payload.hostname || !payload.os_version) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: hostname and os_version' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing update data for device: ${payload.hostname}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate compliance status
    const hasCriticalPending = payload.pending_updates.some(
      u => u.severity?.toLowerCase() === 'critical'
    );
    const hasFailedUpdates = (payload.failed_updates?.length || 0) > 0;
    const complianceStatus = hasCriticalPending || hasFailedUpdates ? 'non-compliant' : 'compliant';

    console.log('Compliance status calculated:', complianceStatus);

    // Get organisation and tenant info
    let organisationId = payload.organisation_id || null;
    let tenantId: number = 1;

    if (organisationId) {
      const { data: orgData } = await supabase
        .from('organisations')
        .select('id')
        .eq('id', organisationId)
        .single();
      
      if (!orgData) {
        console.error('Invalid organisation_id provided');
        organisationId = null;
      }
    }

    // First, try to find existing device by hostname and organisation
    let query = supabase
      .from('system_devices')
      .select('*')
      .eq('device_name', payload.hostname);
    
    if (organisationId) {
      query = query.eq('organisation_id', organisationId);
    }

    const { data: existingDevices } = await query.limit(1);

    let deviceId: string;

    if (existingDevices && existingDevices.length > 0) {
      // Update existing device
      console.log('Updating existing device:', existingDevices[0].id);
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

      if (updateError) {
        console.error('Error updating device:', updateError);
        throw updateError;
      }

      deviceId = updatedDevice.id;
      console.log('Device updated successfully');
    } else {
      // Create new device
      console.log('Creating new device');
      const deviceData: any = {
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
        tenant_id: tenantId,
      };

      if (organisationId) {
        deviceData.organisation_id = organisationId;
      }

      const { data: newDevice, error: insertError } = await supabase
        .from('system_devices')
        .insert(deviceData)
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting device:', insertError);
        throw insertError;
      }

      deviceId = newDevice.id;
      console.log('Device created successfully:', deviceId);
    }

    // Log updates to system_updates table
    const updateEntries = [];

    // Log pending updates
    for (const update of payload.pending_updates) {
      const entryData: any = {
        device_id: deviceId,
        kb_number: update.kb_number,
        title: update.title,
        severity: update.severity || 'Unknown',
        status: 'pending',
        detected_date: new Date().toISOString(),
        tenant_id: tenantId,
      };
      if (organisationId) {
        entryData.organisation_id = organisationId;
      }
      updateEntries.push(entryData);
    }

    // Log failed updates
    if (payload.failed_updates) {
      for (const update of payload.failed_updates) {
        const entryData: any = {
          device_id: deviceId,
          kb_number: update.kb_number,
          title: update.title,
          status: 'failed',
          detected_date: new Date().toISOString(),
          tenant_id: tenantId,
        };
        if (organisationId) {
          entryData.organisation_id = organisationId;
        }
        updateEntries.push(entryData);
      }
    }

    // Log installed updates (only most recent ones)
    for (const update of payload.installed_updates.slice(0, 10)) {
      const entryData: any = {
        device_id: deviceId,
        kb_number: update.kb_number,
        title: update.title,
        status: 'installed',
        installed_date: update.installed_date,
        detected_date: new Date().toISOString(),
        tenant_id: tenantId,
      };
      if (organisationId) {
        entryData.organisation_id = organisationId;
      }
      updateEntries.push(entryData);
    }

    if (updateEntries.length > 0) {
      console.log(`Logging ${updateEntries.length} update entries`);
      const { error: updatesError } = await supabase
        .from('system_updates')
        .upsert(updateEntries, {
          onConflict: 'device_id,kb_number',
          ignoreDuplicates: false,
        });

      if (updatesError) {
        console.error('Error logging updates:', updatesError);
        // Don't fail the entire request if update logging fails
      } else {
        console.log('Updates logged successfully');
      }
    }

    const response = {
      success: true,
      device_id: deviceId,
      hostname: payload.hostname,
      compliance_status: complianceStatus,
      updates_processed: updateEntries.length,
    };

    console.log('Response:', JSON.stringify(response));

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ingest-device-updates function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
