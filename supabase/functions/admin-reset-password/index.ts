import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the requesting user is a super admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Check if user has admin role from user_roles table
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError) {
      console.error('Error checking user role:', roleError)
    }

    const userRole = roleData?.role
    if (!userRole || !['owner', 'admin'].includes(userRole)) {
      console.error('User does not have admin privileges')
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Only admins can reset passwords.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const { userId, newPassword } = await req.json()

    if (!userId || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or newPassword' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Resetting password for user: ${userId}`)

    // Update user password using admin API
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (error) {
      console.error('Error updating password:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get target user email for audit log
    const targetEmail = data?.user?.email || 'unknown'
    const adminEmail = user.email || 'unknown'

    // Insert audit log entry
    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
      action_type: 'password_reset',
      entity_type: 'users',
      entity_id: userId,
      user_id: user.id,
      metadata: {
        target_email: targetEmail,
        reset_by: adminEmail,
        action_description: `Password reset for ${targetEmail} by ${adminEmail}`,
      },
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null,
      user_agent: req.headers.get('user-agent') || null,
    })

    if (auditError) {
      console.error('Error inserting audit log:', auditError)
      // Don't fail the request if audit log fails
    }

    console.log(`Password successfully reset for user: ${userId}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Password updated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
