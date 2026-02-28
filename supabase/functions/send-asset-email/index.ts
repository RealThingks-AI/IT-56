import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AzureCreds {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  senderEmail: string;
  source: string;
}

interface AssetRow {
  asset_tag?: string;
  description?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  photo_url?: string | null;
}

function createSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function logEmailSend(
  templateId: string,
  recipientEmail: string,
  subject: string | null,
  status: "sent" | "failed",
  errorMessage?: string,
  assetId?: string,
) {
  try {
    const supabase = createSupabaseAdmin();
    await supabase.from("itam_email_logs").insert({
      template_id: templateId,
      recipient_email: recipientEmail,
      subject: subject || null,
      status,
      error_message: errorMessage || null,
      asset_id: assetId || null,
    });
  } catch (e) {
    console.warn("Failed to log email send:", e);
  }
}

async function resolveAzureCredentials(): Promise<AzureCreds> {
  try {
    const supabaseAdmin = createSupabaseAdmin();
    const { data } = await supabaseAdmin
      .from("itam_email_config")
      .select("config_value")
      .eq("config_type", "azure_credentials")
      .eq("config_key", "azure_config")
      .maybeSingle();

    const cfg = data?.config_value as any;
    if (cfg?.tenant_id && cfg?.client_id && cfg?.client_secret && cfg?.sender_email) {
      console.log("Using Azure credentials from database");
      return {
        tenantId: cfg.tenant_id, clientId: cfg.client_id,
        clientSecret: cfg.client_secret, senderEmail: cfg.sender_email, source: "database",
      };
    }
  } catch (e) {
    console.warn("Failed to read DB credentials, falling back to env:", e);
  }

  const tenantId = Deno.env.get("AZURE_TENANT_ID");
  const clientId = Deno.env.get("AZURE_CLIENT_ID");
  const clientSecret = Deno.env.get("AZURE_CLIENT_SECRET");
  const senderEmail = Deno.env.get("AZURE_SENDER_EMAIL");

  if (!tenantId || !clientId || !clientSecret || !senderEmail) {
    throw new Error(
      "Azure credentials not configured. Please add them via Admin > Email Settings or set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_SENDER_EMAIL in Edge Function secrets."
    );
  }

  console.log("Using Azure credentials from environment variables");
  return { tenantId, clientId, clientSecret, senderEmail, source: "env" };
}

async function getAzureAccessToken(creds: AzureCreds): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${creds.tenantId}/oauth2/v2.0/token`;
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId, client_secret: creds.clientSecret,
      scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure authentication failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function sendEmailViaGraph(
  accessToken: string, senderEmail: string, toEmails: string[],
  subject: string, htmlBody: string, senderName?: string,
): Promise<void> {
  console.log(`Sending email from ${senderEmail} to: ${toEmails.join(", ")}`);

  const message: Record<string, any> = {
    subject, body: { contentType: "HTML", content: htmlBody },
    toRecipients: toEmails.map(email => ({ emailAddress: { address: email } })),
  };

  if (senderName) {
    message.from = { emailAddress: { name: senderName, address: senderEmail } };
  }

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message, saveToSentItems: true }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send email (${response.status}): ${errorText}`);
  }

  console.log("Email sent successfully via Graph API");
}

function replacePlaceholders(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value || "N/A");
  }
  return result;
}

function buildAssetTableHtml(assets: AssetRow[]): string {
  const thStyle = `padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; border: 1px solid #d4a843;`;
  const headerBg = `background: #4a4a3a; color: #d4a843;`;

  const headerRow = `<tr style="${headerBg}">
    <th style="${thStyle}">Asset Tag ID</th>
    <th style="${thStyle}">Description</th>
    <th style="${thStyle}">Brand</th>
    <th style="${thStyle}">Model</th>
    <th style="${thStyle}">Serial No</th>
    <th style="${thStyle} text-align: center;">Photo</th>
  </tr>`;

  const bodyRows = assets.map((a, i) => {
    const bgColor = i % 2 === 0 ? "#3a3a2a" : "#4a4a3a";
    const tdStyle = `padding: 10px 12px; font-size: 12px; border: 1px solid #d4a843; color: #e5e7eb; background: ${bgColor};`;
    const photoCell = a.photo_url
      ? `<img src="${a.photo_url}" alt="Asset" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #d4a843;" />`
      : `<span style="color: #9ca3af; font-size: 11px;">No photo</span>`;
    return `<tr>
      <td style="${tdStyle}"><strong>${a.asset_tag || "N/A"}</strong></td>
      <td style="${tdStyle}">${a.description || "N/A"}</td>
      <td style="${tdStyle}">${a.brand || "N/A"}</td>
      <td style="${tdStyle}">${a.model || "N/A"}</td>
      <td style="${tdStyle}">${a.serial_number ? `S/N: ${a.serial_number}` : "N/A"}</td>
      <td style="${tdStyle} text-align: center;">${photoCell}</td>
    </tr>`;
  }).join("");

  return `<table style="border-collapse: collapse; width: 100%; margin: 16px 0; border: 1px solid #d4a843; border-radius: 8px; overflow: hidden;">
    <thead>${headerRow}</thead>
    <tbody>${bodyRows}</tbody>
  </table>`;
}

/**
 * Build structured email HTML.
 * Table is injected right after the action line, before "Notes:".
 * Order: Hello + intro → [ASSET TABLE] → Notes → Thank you → Best regards
 */
function wrapInHtmlLayout(body: string, senderName: string, assetTableHtml?: string): string {
  let contentParts: string[];

  if (assetTableHtml) {
    // Split at "Notes:" to inject table before it
    const notesMatch = body.match(/\n\s*Notes:/i);
    if (notesMatch && notesMatch.index !== undefined) {
      const beforeNotes = body.substring(0, notesMatch.index);
      const notesAndAfter = body.substring(notesMatch.index);
      const introHtml = beforeNotes.replace(/\n/g, "<br />");
      const afterHtml = notesAndAfter.replace(/\n/g, "<br />");
      contentParts = [introHtml, assetTableHtml, afterHtml];
    } else {
      // Fallback: split at sign-off patterns
      let beforeSignoff = body;
      let signoffPart = "";
      const signoffPatterns = [/\n\s*Best regards/i, /\n\s*Thank you/i, /\n\s*Thanks/i];
      for (const pattern of signoffPatterns) {
        const match = beforeSignoff.match(pattern);
        if (match && match.index !== undefined) {
          signoffPart = beforeSignoff.substring(match.index);
          beforeSignoff = beforeSignoff.substring(0, match.index);
          break;
        }
      }
      contentParts = [beforeSignoff.replace(/\n/g, "<br />"), assetTableHtml, signoffPart.replace(/\n/g, "<br />")];
    }
  } else {
    contentParts = [body.replace(/\n/g, "<br />")];
  }

  const contentHtml = contentParts.join("");

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; font-size: 14px; }
    .footer { margin-top: 20px; font-size: 12px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1 style="margin: 0; font-size: 20px;">📧 ${senderName}</h1></div>
    <div class="content">${contentHtml}</div>
    <div class="footer">This is an automated message from RT-IT-Hub. Please do not reply directly.</div>
  </div>
</body>
</html>`;
}

async function fetchAssetDetails(supabase: any, assetIds: string[]): Promise<AssetRow[]> {
  if (assetIds.length === 0) return [];
  const { data: assets } = await supabase
    .from("itam_assets")
    .select("asset_tag, name, serial_number, model, custom_fields, itam_categories(name), make:itam_makes!make_id(name)")
    .in("id", assetIds);

  return (assets || []).map((a: any) => ({
    asset_tag: a.asset_tag || "N/A",
    description: a.itam_categories?.name || a.name || "N/A",
    brand: a.make?.name || "N/A",
    model: a.model || "N/A",
    serial_number: a.serial_number || null,
    photo_url: (a.custom_fields as any)?.photo_url || null,
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== send-asset-email: Request received ===");

  try {
    const { templateId, recipientEmail, assetId, assets: assetsInput, variables = {}, testMode } = await req.json();

    const creds = await resolveAzureCredentials();

    // Test mode
    if (testMode) {
      try {
        const accessToken = await getAzureAccessToken(creds);

        if (recipientEmail) {
          const testHtml = wrapInHtmlLayout(
            "This is a test email from RT-IT-Hub.\n\nIf you received this, your Microsoft Graph API email integration is working correctly.\n\nCredential source: " + creds.source + "\nSent at: " + new Date().toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kolkata" }) + "\n\nBest regards,\nIT Team",
            "IT Asset Management - Test"
          );
          await sendEmailViaGraph(accessToken, creds.senderEmail, [recipientEmail], "RT-IT-Hub - Test Email", testHtml);
          await logEmailSend("test", recipientEmail, "RT-IT-Hub - Test Email", "sent");
          return new Response(
            JSON.stringify({ success: true, message: "Test email sent successfully" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: "Azure credentials are valid", senderEmail: creds.senderEmail }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Test mode error:", error);
        if (recipientEmail) {
          await logEmailSend("test", recipientEmail, "RT-IT-Hub - Test Email", "failed", error instanceof Error ? error.message : "Unknown error");
        }
        return new Response(
          JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!templateId || !recipientEmail) {
      return new Response(
        JSON.stringify({ success: false, error: "templateId and recipientEmail are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Template: ${templateId}, Recipient: ${recipientEmail}, Asset: ${assetId || "N/A"}, BulkAssets: ${assetsInput?.length || 0}`);

    const supabase = createSupabaseAdmin();

    // Load template from DB
    const { data: templateConfig } = await supabase
      .from("itam_email_config").select("config_value")
      .eq("config_type", "template").eq("config_key", templateId).maybeSingle();

    const defaultTemplates: Record<string, { subject: string; body: string; enabled: boolean }> = {
      checkout: {
        subject: "Asset Checked Out: {{asset_tag}}",
        body: "Hello {{user_name}},\n\nThis is a confirmation email. The following items are in your possession:\n\nNotes: {{notes}}\n\nThank you.\n\nBest regards,\nIT Team",
        enabled: true,
      },
      checkin: {
        subject: "Asset Returned: {{asset_tag}}",
        body: "Hello {{user_name}},\n\nThis is a confirmation email. The following items have been returned:\n\nNotes: {{notes}}\n\nThank you.\n\nBest regards,\nIT Team",
        enabled: true,
      },
    };

    const template = templateConfig?.config_value as any || defaultTemplates[templateId];
    if (!template) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "No template found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (template.enabled === false) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Template is disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load global settings
    const { data: settingsConfig } = await supabase
      .from("itam_email_config").select("config_value")
      .eq("config_type", "settings").eq("config_key", "global_settings").maybeSingle();

    const settings = (settingsConfig?.config_value as any) || {
      senderName: "IT Asset Management", sendCopyToAdmins: false,
    };

    // Build asset table: from `assets` array (bulk) or single `assetId`
    let assetRows: AssetRow[] = [];
    let assetVars: Record<string, string> = {};

    if (assetsInput && Array.isArray(assetsInput) && assetsInput.length > 0) {
      assetRows = assetsInput as AssetRow[];
      assetVars = {
        asset_name: assetRows[0].description || "Multiple Assets",
        asset_tag: assetRows.length > 1 ? `${assetRows.length} assets` : (assetRows[0].asset_tag || "N/A"),
        category: assetRows[0].description || "N/A",
      };
    } else if (assetId) {
      assetRows = await fetchAssetDetails(supabase, [assetId]);
      if (assetRows.length > 0) {
        assetVars = {
          asset_name: assetRows[0].description || "Unknown",
          asset_tag: assetRows[0].asset_tag || "N/A",
          category: assetRows[0].description || "N/A",
        };
      }
    }

    const assetTableHtml = assetRows.length > 0 ? buildAssetTableHtml(assetRows) : undefined;

    const allVars = { ...assetVars, ...variables };
    if (!allVars.notes) allVars.notes = "—";

    const subject = replacePlaceholders(template.subject, allVars);
    const body = replacePlaceholders(template.body, allVars);
    const htmlBody = wrapInHtmlLayout(body, settings.senderName || "IT Asset Management", assetTableHtml);

    const accessToken = await getAzureAccessToken(creds);
    const recipients = [recipientEmail];

    if (settings.sendCopyToAdmins) {
      const { data: admins } = await supabase
        .from("users").select("email").eq("role", "admin").eq("status", "active");

      if (admins) {
        for (const admin of admins) {
          if (admin.email && admin.email !== recipientEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email)) {
            recipients.push(admin.email);
          }
        }
      }
    }

    try {
      await sendEmailViaGraph(accessToken, creds.senderEmail, recipients, subject, htmlBody, settings.senderName);
      for (const r of recipients) {
        await logEmailSend(templateId, r, subject, "sent", undefined, assetId);
      }
    } catch (sendError) {
      for (const r of recipients) {
        await logEmailSend(templateId, r, subject, "failed", sendError instanceof Error ? sendError.message : "Unknown error", assetId);
      }
      throw sendError;
    }

    console.log(`=== Email sent successfully to ${recipients.length} recipient(s) ===`);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent", recipients: recipients.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-asset-email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
