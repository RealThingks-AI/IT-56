import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all active/expiring_soon subscriptions with renewal dates and alert days
    const { data: subs, error: subsError } = await supabase
      .from("subscriptions_tools")
      .select("id, tool_name, renewal_date, renewal_alert_days, subscription_type, auto_renew, status, owner_name, owner_email")
      .in("status", ["active", "expiring_soon", "trial"])
      .not("renewal_date", "is", null);

    if (subsError) throw subsError;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ message: "No subscriptions to check", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let notificationsCreated = 0;

    // Get all users to notify (admins + owners)
    const { data: adminUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const adminUserIds = (adminUsers || []).map((u) => u.user_id);

    for (const sub of subs) {
      const renewalDate = new Date(sub.renewal_date);
      renewalDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((renewalDate.getTime() - now.getTime()) / 86400000);
      const alertDays = sub.renewal_alert_days || 30;

      // Only send alert if within the alert window and not already past
      if (diffDays < 0 || diffDays > alertDays) continue;

      // Determine urgency label
      let urgencyLabel = "upcoming";
      if (diffDays <= 2) urgencyLabel = "critical";
      else if (diffDays <= 7) urgencyLabel = "soon";

      const title = diffDays === 0
        ? `🔔 ${sub.tool_name} renews today`
        : diffDays <= 2
          ? `🚨 ${sub.tool_name} renews in ${diffDays} day${diffDays > 1 ? "s" : ""}`
          : `📅 ${sub.tool_name} renews in ${diffDays} days`;

      const message = sub.auto_renew
        ? `Auto-renewal is enabled. Renewal date: ${sub.renewal_date}.`
        : `Manual renewal required. Renewal date: ${sub.renewal_date}.`;

      // Notify admin users
      for (const userId of adminUserIds) {
        // Check if notification already exists today for this subscription
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("type", "system_alert")
          .gte("created_at", todayStart.toISOString())
          .like("title", `%${sub.tool_name}%`)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const { error: notifError } = await supabase.rpc("create_notification", {
          p_user_id: userId,
          p_title: title,
          p_message: message,
          p_type: "system_alert",
        });

        if (!notifError) notificationsCreated++;
      }
    }

    return new Response(
      JSON.stringify({
        message: "Renewal check complete",
        subscriptions_checked: subs.length,
        notifications_created: notificationsCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Renewal check error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
