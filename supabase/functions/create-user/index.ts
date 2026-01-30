import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserRequest {
  email: string;
  password: string;
  name?: string;
  role: "admin" | "manager" | "user" | "viewer";
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the calling user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: { user: callerUser }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller has admin role
    const { data: callerRoles, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id);

    if (roleError) {
      console.error("Error checking caller role:", roleError);
      return new Response(
        JSON.stringify({ error: "Failed to verify permissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerRole = callerRoles?.[0]?.role;
    if (!callerRole || !["admin", "owner"].includes(callerRole)) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions. Only admins can create users." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password, name, role }: CreateUserRequest = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    const validRoles = ["admin", "manager", "user", "viewer"];
    if (!role || !validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: "Valid role is required (admin, manager, user, viewer)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailLower = String(email).trim().toLowerCase();
    console.log("Creating user:", emailLower, "with role:", role);

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error("Error listing users:", listError);
      return new Response(
        JSON.stringify({ error: "Failed to check existing users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userExists = existingUsers.users.some(
      (user) => user.email?.toLowerCase() === emailLower
    );

    if (userExists) {
      return new Response(
        JSON.stringify({ error: "A user with this email already exists" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the caller's organisation_id
    const { data: callerData, error: callerDataError } = await supabaseAdmin
      .from("users")
      .select("organisation_id, tenant_id")
      .eq("auth_user_id", callerUser.id)
      .single();

    if (callerDataError || !callerData?.organisation_id) {
      console.error("Error getting caller organisation:", callerDataError);
      return new Response(
        JSON.stringify({ error: "Failed to get organization information" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the user directly with password
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: emailLower,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: name || null,
        organisation_id: callerData.organisation_id,
        created_by: callerUser.id,
        initial_role: role,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message || "Failed to create user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user record in public.users table
    if (createData.user) {
      const { error: userInsertError } = await supabaseAdmin
        .from("users")
        .insert({
          auth_user_id: createData.user.id,
          email: emailLower,
          name: name || null,
          role: role,
          organisation_id: callerData.organisation_id,
          tenant_id: callerData.tenant_id,
          status: "active",
        });

      if (userInsertError) {
        console.error("Error creating user record:", userInsertError);
        // Don't fail - auth user is created, record might be created by trigger
      }

      // Assign the role to the new user
      const { error: roleInsertError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: createData.user.id,
          role: role,
        });

      if (roleInsertError) {
        console.error("Error assigning role:", roleInsertError);
        // Don't fail the whole operation
      }
    }

    console.log("User created successfully:", emailLower);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User created successfully",
        userId: createData.user?.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("System error in create-user:", error);
    return new Response(
      JSON.stringify({ error: "System error occurred. Please try again later." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
