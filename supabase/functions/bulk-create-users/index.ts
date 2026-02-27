import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserRow {
  email: string;
  name: string;
  password: string;
  role?: string;
}

Deno.serve(async (req) => {
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
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const { data: { user: callerUser }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id);

    const callerRole = callerRoles?.[0]?.role;
    if (!callerRole || !["admin", "owner"].includes(callerRole)) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions. Only admins can bulk create users." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get caller's info
    const { data: callerData } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_user_id", callerUser.id)
      .single();

    const { users: userRows, defaultRole = "user" }: { users: UserRow[]; defaultRole?: string } = await req.json();

    if (!userRows || !Array.isArray(userRows) || userRows.length === 0) {
      return new Response(
        JSON.stringify({ error: "No users provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all existing users once for efficiency
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const existingEmails = new Set(
      (existingUsers?.users || []).map((u) => u.email?.toLowerCase())
    );

    const results: { email: string; status: "created" | "skipped" | "error"; error?: string }[] = [];
    let created = 0;
    let skipped = 0;
    let errored = 0;

    for (const row of userRows) {
      const email = String(row.email).trim().toLowerCase();
      const name = String(row.name || "").trim();
      const password = String(row.password || "").trim();
      const role = row.role || defaultRole;

      if (!email) {
        results.push({ email: email || "(empty)", status: "error", error: "Email is required" });
        errored++;
        continue;
      }

      if (password.length < 6) {
        results.push({ email, status: "error", error: "Password must be at least 6 characters" });
        errored++;
        continue;
      }

      // Skip if already exists
      if (existingEmails.has(email)) {
        results.push({ email, status: "skipped", error: "User already exists" });
        skipped++;
        continue;
      }

      try {
        // Create auth user
        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            name: name || null,
            created_by: callerUser.id,
            initial_role: role,
          },
        });

        if (createError) {
          console.error(`Failed to create user ${email}:`, createError.message);
          results.push({ email, status: "error", error: createError.message });
          errored++;
          continue;
        }

        if (createData.user) {
          // The handle_new_auth_user trigger already creates the users and user_roles records.
          // Just update them if needed (e.g. trigger may set different defaults).
          await supabaseAdmin.from("users")
            .update({ name: name || null, role, status: "active" })
            .eq("auth_user_id", createData.user.id);

          // Ensure user_roles entry exists with correct role
          await supabaseAdmin.from("user_roles")
            .upsert({ user_id: createData.user.id, role }, { onConflict: "user_id,role" });

          existingEmails.add(email);
          results.push({ email, status: "created" });
          created++;

          // Insert audit log for each created user
          const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
          await supabaseAdmin.from('audit_logs').insert({
            action_type: 'user_created',
            entity_type: 'users',
            entity_id: createData.user.id,
            user_id: callerUser.id,
            ip_address: ipAddress,
            user_agent: req.headers.get('user-agent') || null,
            metadata: {
              target_email: email,
              created_by_email: callerUser.email,
              role,
              name: name || null,
              source: 'bulk_import',
            },
          });
        }
      } catch (err: any) {
        results.push({ email, status: "error", error: err.message || "Unknown error" });
        errored++;
      }
    }

    console.log(`Bulk create complete: ${created} created, ${skipped} skipped, ${errored} errors`);

    return new Response(
      JSON.stringify({ created, skipped, errored, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("System error in bulk-create-users:", error);
    return new Response(
      JSON.stringify({ error: "System error occurred. Please try again later." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
