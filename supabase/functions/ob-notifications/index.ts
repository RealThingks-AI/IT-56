import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getAzureAccessToken(): Promise<{ token: string; senderEmail: string }> {
  const tenantId = Deno.env.get("AZURE_TENANT_ID")!;
  const clientId = Deno.env.get("AZURE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("AZURE_CLIENT_SECRET")!;
  const senderEmail = Deno.env.get("AZURE_SENDER_EMAIL")!;

  if (!tenantId || !clientId || !clientSecret || !senderEmail) {
    throw new Error("Azure email credentials not configured");
  }

  const resp = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Azure auth failed: ${err}`);
  }

  const data = await resp.json();
  return { token: data.access_token, senderEmail };
}

function buildWorkflowEmailHtml(params: {
  type: string;
  employeeName: string;
  department: string;
  startDate?: string;
  lastDay?: string;
  assignedTo?: string;
  templateName?: string;
}): string {
  const isOnboarding = params.type === "onboarding";
  const accentColor = isOnboarding ? "#16a34a" : "#dc2626";
  const title = isOnboarding ? "New Onboarding Workflow" : "New Offboarding Workflow";
  const dateLabel = isOnboarding ? "Start Date" : "Last Day";
  const dateValue = (isOnboarding ? params.startDate : params.lastDay) || "Not set";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td style="background:${accentColor};padding:16px 24px;">
<h1 style="margin:0;color:#ffffff;font-size:18px;">${title}</h1>
</td></tr>
<tr><td style="padding:24px;">
<table width="100%" cellpadding="8" cellspacing="0" style="font-size:14px;color:#374151;">
<tr><td style="font-weight:600;width:140px;">Employee</td><td>${params.employeeName}</td></tr>
<tr><td style="font-weight:600;">Department</td><td>${params.department || "—"}</td></tr>
<tr><td style="font-weight:600;">${dateLabel}</td><td>${dateValue}</td></tr>
<tr><td style="font-weight:600;">Template</td><td>${params.templateName || "None"}</td></tr>
${params.assignedTo ? `<tr><td style="font-weight:600;">Assigned To</td><td>${params.assignedTo}</td></tr>` : ""}
</table>
<p style="margin-top:20px;font-size:13px;color:#6b7280;">This is an automated notification from the IT Hub Onboarding/Offboarding module.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { recipientEmails, type, employeeName, department, startDate, lastDay, assignedTo, templateName } = body;

    if (!recipientEmails?.length || !employeeName || !type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token, senderEmail } = await getAzureAccessToken();
    const isOnboarding = type === "onboarding";
    const subject = `${isOnboarding ? "Onboarding" : "Offboarding"}: ${employeeName}`;
    const html = buildWorkflowEmailHtml({ type, employeeName, department, startDate, lastDay, assignedTo, templateName });

    const message = {
      subject,
      body: { contentType: "HTML", content: html },
      toRecipients: recipientEmails.map((email: string) => ({ emailAddress: { address: email } })),
      from: { emailAddress: { name: "IT Hub Notifications", address: senderEmail } },
    };

    const sendResp = await fetch(`https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message, saveToSentItems: true }),
    });

    if (!sendResp.ok) {
      const err = await sendResp.text();
      throw new Error(`Graph API send failed (${sendResp.status}): ${err}`);
    }

    console.log(`OB notification sent to ${recipientEmails.join(", ")}`);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ob-notifications error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
