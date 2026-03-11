import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  userId: string;
  type: "email" | "phone";
  value: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // Verify caller identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: userError } = await userClient.auth.getUser();
    if (userError || !caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, type, value }: VerificationRequest = await req.json();

    // Validate input
    if (!userId || !type || !value) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["email", "phone"].includes(type)) {
      return new Response(
        JSON.stringify({ error: "Invalid verification type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure caller can only request verification for themselves
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: targetUser } = await adminClient
      .from("users")
      .select("auth_user_id")
      .eq("id", userId)
      .single();

    if (!targetUser || targetUser.auth_user_id !== caller.id) {
      return new Response(
        JSON.stringify({ error: "You can only request verification for your own account" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate value format
    if (type === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value) || value.length > 255) {
        return new Response(
          JSON.stringify({ error: "Invalid email format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (type === "phone") {
      const phoneRegex = /^\+?[0-9]{7,15}$/;
      if (!phoneRegex.test(value)) {
        return new Response(
          JSON.stringify({ error: "Invalid phone number format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Store verification code in database
    const { error: codeError } = await adminClient
      .from("recovery_verification_codes")
      .insert({
        user_id: userId,
        type,
        code: verificationCode,
        expires_at: expiresAt.toISOString(),
      });

    if (codeError) throw codeError;

    // Log for server-side debugging only (code never sent to client)
    console.log(`Verification code generated for user ${userId} (${type})`);

    const message = type === "email"
      ? "Email verification feature requires email service configuration. Contact your administrator."
      : "SMS verification feature requires SMS service configuration. Contact your administrator.";

    return new Response(
      JSON.stringify({ success: true, message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-recovery-verification:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
