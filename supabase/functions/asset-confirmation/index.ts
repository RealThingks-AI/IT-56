import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function createSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

const TOKEN_EXPIRY_DAYS = 7;

function redirectToResult(params: Record<string, string | string[]>): Response {
  let baseUrl = Deno.env.get("SITE_URL") || "https://it.realthingks.com";
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    baseUrl = "https://" + baseUrl;
  }
  const url = new URL("/confirmation-result", baseUrl);
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) {
      v.forEach(val => url.searchParams.append(k, val));
    } else {
      url.searchParams.set(k, v);
    }
  }
  return new Response(null, {
    status: 302,
    headers: { Location: url.toString() },
  });
}

async function validateToken(supabase: any, token: string) {
  const { data: confirmation, error } = await supabase
    .from("itam_asset_confirmations")
    .select("*, items:itam_asset_confirmation_items(*)")
    .eq("token", token)
    .maybeSingle();

  if (error || !confirmation) {
    return { error: "invalid" as const };
  }

  const createdAt = new Date(confirmation.created_at);
  const expiryDate = new Date(createdAt.getTime() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  if (new Date() > expiryDate) {
    await supabase.from("itam_asset_confirmations").update({ status: "expired" }).eq("id", confirmation.id);
    return { error: "expired" as const };
  }

  if (confirmation.status === "completed") {
    return { error: "completed" as const };
  }

  return { confirmation };
}

async function checkAndCompleteConfirmation(supabase: any, confirmationId: string) {
  const { data: items } = await supabase
    .from("itam_asset_confirmation_items")
    .select("id, response")
    .eq("confirmation_id", confirmationId);

  const allResponded = (items || []).every((it: any) => it.response === "confirmed" || it.response === "denied");
  if (allResponded && (items || []).length > 0) {
    await supabase.from("itam_asset_confirmations").update({
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", confirmationId);
  }
}

async function notifyDeniedAssets(supabase: any, confirmation: any, deniedAssets: string[]) {
  if (deniedAssets.length === 0 || !confirmation.requested_by) return;
  const { data: reqUser } = await supabase.from("users").select("auth_user_id").eq("id", confirmation.requested_by).single();
  const { data: empUser } = await supabase.from("users").select("name, email").eq("id", confirmation.user_id).single();
  const empName = empUser?.name || empUser?.email || "An employee";

  if (reqUser?.auth_user_id) {
    await supabase.from("notifications").insert({
      user_id: reqUser.auth_user_id,
      title: "Asset Confirmation Denied",
      message: `${empName} denied ${deniedAssets.length} asset(s): ${deniedAssets.join(", ")}. Please review.`,
      type: "warning",
    });
  }
}

function getAssetLabel(item: any): string {
  return item.asset_tag || item.asset_name || "Unknown Asset";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createSupabaseAdmin();

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const token = url.searchParams.get("token");
      const action = url.searchParams.get("action");
      const itemId = url.searchParams.get("item_id");

      if (!token) {
        return new Response(JSON.stringify({ error: "Token required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Handle individual item confirm/deny
      if ((action === "confirm_item" || action === "deny_item") && itemId) {
        const result = await validateToken(supabase, token);
        if (result.error === "invalid") return redirectToResult({ error: "invalid" });
        if (result.error === "expired") return redirectToResult({ error: "expired" });
        if (result.error === "completed") return redirectToResult({ error: "already_completed" });

        const confirmation = result.confirmation!;
        const responseValue = action === "confirm_item" ? "confirmed" : "denied";
        const now = new Date().toISOString();

        const item = (confirmation.items || []).find((it: any) => it.id === itemId);
        if (!item) {
          return redirectToResult({ error: "not_found" });
        }

        const assetLabel = getAssetLabel(item);

        if (item.response) {
          return redirectToResult({ error: "already_responded", asset: assetLabel, already: item.response });
        }

        await supabase.from("itam_asset_confirmation_items").update({
          response: responseValue,
          responded_at: now,
        }).eq("id", itemId);

        if (item.asset_id) {
          await supabase.from("itam_assets").update({
            confirmation_status: responseValue,
            ...(responseValue === "confirmed" ? { last_confirmed_at: now } : {}),
          }).eq("id", item.asset_id);
        }

        await checkAndCompleteConfirmation(supabase, confirmation.id);

        if (responseValue === "denied") {
          await notifyDeniedAssets(supabase, confirmation, [assetLabel]);
        }

        return redirectToResult({ status: responseValue, asset: assetLabel });
      }

      // Handle bulk confirm_all / deny_all
      if (action === "confirm_all" || action === "deny_all") {
        const result = await validateToken(supabase, token);
        if (result.error === "invalid") return redirectToResult({ error: "invalid" });
        if (result.error === "expired") return redirectToResult({ error: "expired" });
        if (result.error === "completed") return redirectToResult({ error: "already_completed" });

        const confirmation = result.confirmation!;
        const responseValue = action === "confirm_all" ? "confirmed" : "denied";
        const now = new Date().toISOString();
        const processedAssets: string[] = [];
        const deniedAssets: string[] = [];

        for (const item of (confirmation.items || [])) {
          const label = getAssetLabel(item);
          if (item.response) continue;
          await supabase.from("itam_asset_confirmation_items").update({
            response: responseValue,
            responded_at: now,
          }).eq("id", item.id);

          processedAssets.push(label);

          if (item.asset_id) {
            await supabase.from("itam_assets").update({
              confirmation_status: responseValue,
              ...(responseValue === "confirmed" ? { last_confirmed_at: now } : {}),
            }).eq("id", item.asset_id);

            if (responseValue === "denied") {
              deniedAssets.push(label);
            }
          }
        }

        await supabase.from("itam_asset_confirmations").update({
          status: "completed",
          completed_at: now,
        }).eq("id", confirmation.id);

        await notifyDeniedAssets(supabase, confirmation, deniedAssets);

        const count = processedAssets.length || (confirmation.items || []).length;
        return redirectToResult({
          status: responseValue,
          count: String(count),
          assets: processedAssets,
        });
      }

      // Default GET: return confirmation data as JSON
      const acceptHeader = req.headers.get("Accept") || "";
      const wantsJson = acceptHeader.includes("application/json");

      if (!wantsJson) {
        return redirectToResult({ error: "invalid" });
      }

      const { data: confirmation, error } = await supabase
        .from("itam_asset_confirmations")
        .select("*, items:itam_asset_confirmation_items(*)")
        .eq("token", token)
        .maybeSingle();

      if (error || !confirmation) {
        return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const createdAt = new Date(confirmation.created_at);
      const expiryDate = new Date(createdAt.getTime() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      if (new Date() > expiryDate) {
        await supabase.from("itam_asset_confirmations").update({ status: "expired" }).eq("id", confirmation.id);
        return new Response(JSON.stringify({ error: "This confirmation link has expired", expired: true }), {
          status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (confirmation.status === "completed") {
        return new Response(JSON.stringify({ error: "Already completed", completed: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: user } = await supabase.from("users").select("name, email").eq("id", confirmation.user_id).single();

      const sanitizedItems = (confirmation.items || []).map((item: any) => ({
        id: item.id,
        asset_tag: item.asset_tag,
        asset_name: item.asset_name,
        response: item.response,
        deny_reason: item.deny_reason,
      }));

      return new Response(JSON.stringify({
        id: confirmation.id,
        status: confirmation.status,
        requested_at: confirmation.requested_at,
        user_name: user?.name || user?.email || "Unknown",
        items: sanitizedItems,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const { token, items } = await req.json();

      if (!token || !items || !Array.isArray(items)) {
        return new Response(JSON.stringify({ error: "token and items[] required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: confirmation } = await supabase
        .from("itam_asset_confirmations")
        .select("id, user_id, requested_by, status")
        .eq("token", token)
        .maybeSingle();

      if (!confirmation || confirmation.status !== "pending") {
        return new Response(JSON.stringify({ error: "Invalid, expired, or already completed" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date().toISOString();
      const deniedAssets: string[] = [];

      for (const item of items) {
        const { id: itemId, response, deny_reason } = item;
        if (!itemId || !["confirmed", "denied"].includes(response)) continue;

        await supabase.from("itam_asset_confirmation_items").update({
          response,
          deny_reason: response === "denied" ? (deny_reason || null) : null,
          responded_at: now,
        }).eq("id", itemId);

        const { data: itemData } = await supabase
          .from("itam_asset_confirmation_items")
          .select("asset_id, asset_tag, asset_name")
          .eq("id", itemId)
          .single();

        if (itemData?.asset_id) {
          await supabase.from("itam_assets").update({
            confirmation_status: response,
            last_confirmed_at: response === "confirmed" ? now : null,
          }).eq("id", itemData.asset_id);

          if (response === "denied") {
            deniedAssets.push(itemData.asset_tag || itemData.asset_name || itemData.asset_id);
          }
        }
      }

      await supabase.from("itam_asset_confirmations").update({
        status: "completed",
        completed_at: now,
      }).eq("id", confirmation.id);

      if (deniedAssets.length > 0 && confirmation.requested_by) {
        const { data: reqUser } = await supabase.from("users").select("auth_user_id").eq("id", confirmation.requested_by).single();
        const { data: empUser } = await supabase.from("users").select("name, email").eq("id", confirmation.user_id).single();
        const empName = empUser?.name || empUser?.email || "An employee";

        if (reqUser?.auth_user_id) {
          await supabase.from("notifications").insert({
            user_id: reqUser.auth_user_id,
            title: "Asset Confirmation Denied",
            message: `${empName} denied ${deniedAssets.length} asset(s): ${deniedAssets.join(", ")}. Please review.`,
            type: "warning",
          });
        }
      }

      return new Response(JSON.stringify({ success: true, denied_count: deniedAssets.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("asset-confirmation error:", error);
    return new Response(JSON.stringify({ error: "An error occurred. Please try again or contact your IT administrator." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
