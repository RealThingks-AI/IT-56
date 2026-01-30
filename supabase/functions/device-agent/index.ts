import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeviceAgentPayload {
  type: 'heartbeat' | 'update_data' | 'get_tasks' | 'task_result';
  device_id?: string;
  agent_version?: string;
  organisation_id?: string;
  device_info?: any;
  hostname?: string;
  serial_number?: string;
  os_version?: string;
  os_build?: string;
  last_boot_time?: string;
  ip_address?: string;
  pending_updates?: any[];
  installed_updates?: any[];
  failed_updates?: any[];
  task_id?: string;
  status?: string;
  result?: any;
  error_message?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Device Agent Request ===');
    
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

    const payload: DeviceAgentPayload = await req.json();
    console.log('Request type:', payload.type);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle different request types
    switch (payload.type) {
      case 'heartbeat':
        return await handleHeartbeat(supabase, payload);
      
      case 'update_data':
        return await handleUpdateData(supabase, payload);
      
      case 'get_tasks':
        return await handleGetTasks(supabase, payload);
      
      case 'task_result':
        return await handleTaskResult(supabase, payload);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid request type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleHeartbeat(supabase: any, payload: DeviceAgentPayload) {
  console.log('Processing heartbeat...');
  
  let deviceId = payload.device_id;
  const organisationId = payload.organisation_id;
  const deviceInfo = payload.device_info;
  
  // Get tenant_id from organisation
  const { data: orgData } = await supabase
    .from('organisations')
    .select('id')
    .eq('id', organisationId)
    .single();
  
  const tenantId = 1; // Default tenant

  // Find or create device
  if (!deviceId) {
    const { data: existingDevice } = await supabase
      .from('system_devices')
      .select('id')
      .eq('device_name', deviceInfo.hostname)
      .eq('organisation_id', organisationId)
      .single();
    
    if (existingDevice) {
      deviceId = existingDevice.id;
    } else {
      const { data: newDevice, error } = await supabase
        .from('system_devices')
        .insert({
          device_name: deviceInfo.hostname,
          device_uuid: deviceInfo.serial_number || deviceInfo.hostname,
          os_type: 'Windows',
          os_version: deviceInfo.os_version,
          os_build: deviceInfo.os_build,
          last_seen: new Date().toISOString(),
          organisation_id: organisationId,
          tenant_id: tenantId,
        })
        .select()
        .single();
      
      if (error) throw error;
      deviceId = newDevice.id;
    }
  }

  // Update device last_seen
  await supabase
    .from('system_devices')
    .update({ 
      last_seen: new Date().toISOString(),
      os_version: deviceInfo.os_version,
      os_build: deviceInfo.os_build,
    })
    .eq('id', deviceId);

  // Insert heartbeat record
  await supabase
    .from('device_heartbeats')
    .insert({
      device_id: deviceId,
      tenant_id: tenantId,
      organisation_id: organisationId,
      heartbeat_at: new Date().toISOString(),
      status: 'online',
      agent_version: payload.agent_version,
    });

  console.log('Heartbeat recorded for device:', deviceId);

  return new Response(
    JSON.stringify({ 
      success: true, 
      device_id: deviceId,
      message: 'Heartbeat received'
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleUpdateData(supabase: any, payload: DeviceAgentPayload) {
  console.log('Processing update data...');
  
  const deviceId = payload.device_id;
  const organisationId = payload.organisation_id;
  const tenantId = 1;

  // Calculate compliance status
  const hasCriticalPending = payload.pending_updates?.some(
    u => u.severity?.toLowerCase() === 'critical'
  );
  const hasFailedUpdates = (payload.failed_updates?.length || 0) > 0;
  const complianceStatus = hasCriticalPending || hasFailedUpdates ? 'non-compliant' : 'compliant';

  // Update device with compliance info
  await supabase
    .from('system_devices')
    .update({
      last_update_scan: new Date().toISOString(),
      update_compliance_status: complianceStatus,
      pending_critical_count: payload.pending_updates?.filter(u => u.severity?.toLowerCase() === 'critical').length || 0,
      pending_total_count: payload.pending_updates?.length || 0,
      failed_updates_count: payload.failed_updates?.length || 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', deviceId);

  // Clear old pending updates for this device
  await supabase
    .from('system_updates')
    .delete()
    .eq('device_id', deviceId)
    .in('status', ['pending', 'failed']);

  // Insert pending updates
  const updateEntries = [];
  for (const update of payload.pending_updates || []) {
    updateEntries.push({
      device_id: deviceId,
      kb_number: update.kb_number,
      title: update.title,
      severity: update.severity || 'Unknown',
      status: 'pending',
      detected_date: new Date().toISOString(),
      tenant_id: tenantId,
      organisation_id: organisationId,
    });
  }

  // Insert failed updates
  for (const update of payload.failed_updates || []) {
    updateEntries.push({
      device_id: deviceId,
      kb_number: update.kb_number,
      title: update.title,
      status: 'failed',
      detected_date: new Date().toISOString(),
      tenant_id: tenantId,
      organisation_id: organisationId,
    });
  }

  // Insert installed updates (recent only)
  for (const update of (payload.installed_updates || []).slice(0, 10)) {
    updateEntries.push({
      device_id: deviceId,
      kb_number: update.kb_number,
      title: update.title,
      status: 'installed',
      installed_date: update.installed_date,
      detected_date: new Date().toISOString(),
      tenant_id: tenantId,
      organisation_id: organisationId,
    });
  }

  if (updateEntries.length > 0) {
    await supabase
      .from('system_updates')
      .upsert(updateEntries, {
        onConflict: 'device_id,kb_number',
        ignoreDuplicates: false,
      });
  }

  console.log('Update data processed. Compliance:', complianceStatus);

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
}

async function handleGetTasks(supabase: any, payload: DeviceAgentPayload) {
  console.log('Getting pending tasks for device:', payload.device_id);
  
  const { data: tasks, error } = await supabase
    .from('device_tasks')
    .select('*')
    .eq('device_id', payload.device_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Mark tasks as in_progress
  if (tasks && tasks.length > 0) {
    const taskIds = tasks.map((t: any) => t.id);
    await supabase
      .from('device_tasks')
      .update({ 
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .in('id', taskIds);
  }

  console.log(`Found ${tasks?.length || 0} pending tasks`);

  return new Response(
    JSON.stringify({ 
      success: true,
      tasks: tasks || []
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleTaskResult(supabase: any, payload: DeviceAgentPayload) {
  console.log('Processing task result:', payload.task_id);
  
  const { error } = await supabase
    .from('device_tasks')
    .update({
      status: payload.status,
      completed_at: new Date().toISOString(),
      result: payload.result,
      error_message: payload.error_message,
    })
    .eq('id', payload.task_id);

  if (error) throw error;

  console.log('Task result recorded');

  return new Response(
    JSON.stringify({ 
      success: true,
      message: 'Task result recorded'
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
