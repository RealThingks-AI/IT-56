import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteUserRequest {
  email: string;
  name?: string;
  role: "admin" | "manager" | "user" | "viewer";
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
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
    if (!callerRole || callerRole !== "admin") {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions. Only admins can invite users." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, name, role }: InviteUserRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role - only 4 roles now
    const validRoles = ["admin", "manager", "user", "viewer"];
    if (!role || !validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: "Valid role is required (admin, manager, user, viewer)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailLower = String(email).trim().toLowerCase();
    console.log("Inviting user:", emailLower, "with role:", role);

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

    // Invite the user
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      emailLower,
      {
        data: {
          name: name || null,
          invited_by: callerUser.id,
          initial_role: role,
        },
        redirectTo: `${req.headers.get("origin")}/auth/confirm`,
      }
    );

    if (inviteError) {
      console.error("Error inviting user:", inviteError);
      return new Response(
        JSON.stringify({ error: inviteError.message || "Failed to invite user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign the role to the new user
    if (inviteData.user) {
      const { error: roleInsertError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: inviteData.user.id,
          role: role,
        });

      if (roleInsertError) {
        console.error("Error assigning role:", roleInsertError);
        // Don't fail the whole operation, the user is already invited
      }
    }

    console.log("User invited successfully:", emailLower);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User invited successfully",
        userId: inviteData.user?.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("System error in invite-user:", error);
    return new Response(
      JSON.stringify({ error: "System error occurred. Please try again later." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
