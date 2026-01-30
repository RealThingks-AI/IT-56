import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAzureAccessToken(): Promise<string> {
  const tenantId = Deno.env.get("AZURE_TENANT_ID");
  const clientId = Deno.env.get("AZURE_CLIENT_ID");
  const clientSecret = Deno.env.get("AZURE_CLIENT_SECRET");

  if (!tenantId || !clientId || !clientSecret) {
    console.error("Missing Azure credentials:", { 
      hasTenantId: !!tenantId, 
      hasClientId: !!clientId, 
      hasClientSecret: !!clientSecret 
    });
    throw new Error("Azure credentials not configured");
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  console.log("Requesting Azure access token...");
  
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Azure auth failed:", errorText);
    throw new Error(`Azure authentication failed: ${errorText}`);
  }

  const data = await response.json();
  console.log("Azure access token obtained successfully");
  return data.access_token;
}

async function sendEmailViaGraph(
  accessToken: string, 
  toEmails: string[], 
  subject: string, 
  htmlBody: string
): Promise<void> {
  const senderEmail = Deno.env.get("AZURE_SENDER_EMAIL");
  
  if (!senderEmail) {
    throw new Error("AZURE_SENDER_EMAIL not configured");
  }

  console.log(`Sending email to ${toEmails.length} recipient(s): ${toEmails.join(", ")}`);

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { 
            contentType: "HTML", 
            content: htmlBody 
          },
          toRecipients: toEmails.map(email => ({ 
            emailAddress: { address: email } 
          })),
        },
        saveToSentItems: true,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to send email via Graph:", errorText);
    throw new Error(`Failed to send email: ${errorText}`);
  }

  console.log("Email sent successfully");
}

// Validate email format and domain
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  
  // Skip obviously fake/test domains
  const invalidDomains = ['example.com', 'test.com', 'rt.com', 'localhost'];
  const domain = email.split('@')[1]?.toLowerCase();
  if (invalidDomains.includes(domain)) return false;
  
  return true;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userName } = await req.json();

    if (!userEmail) {
      return new Response(
        JSON.stringify({ success: false, error: "User email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedEmail = userEmail.trim().toLowerCase();
    console.log(`Password reset request received for: ${trimmedEmail}`);

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // First, find the user requesting reset to get their organisation
    const { data: requestingUser, error: userError } = await supabase
      .from("users")
      .select("id, email, name, organisation_id")
      .eq("email", trimmedEmail)
      .maybeSingle();

    if (userError) {
      console.error("Error finding user:", userError);
    }

    // Get admin emails - filter by organisation if user was found
    let adminQuery = supabase
      .from("users")
      .select("email, name, organisation_id")
      .eq("role", "admin")
      .eq("status", "active");

    // If user belongs to an organisation, only notify admins from that organisation
    if (requestingUser?.organisation_id) {
      console.log(`User belongs to organisation: ${requestingUser.organisation_id}`);
      adminQuery = adminQuery.eq("organisation_id", requestingUser.organisation_id);
    }

    const { data: admins, error: adminError } = await adminQuery;

    if (adminError) {
      console.error("Error fetching admins:", adminError);
      throw new Error("Failed to fetch administrators");
    }

    // Filter to only valid email addresses
    const validAdminEmails = admins
      ?.map(a => a.email)
      .filter((email): email is string => isValidEmail(email)) || [];
    
    console.log(`Found ${admins?.length || 0} admin(s), ${validAdminEmails.length} with valid emails`);

    if (validAdminEmails.length === 0) {
      console.warn("No administrators with valid emails found");
      // Still return success to user - don't reveal system details
      return new Response(
        JSON.stringify({ success: true, message: "Request submitted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Azure access token
    const accessToken = await getAzureAccessToken();
    
    // Format the current date/time
    const requestTime = new Date().toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Asia/Kolkata"
    });

    // Properly format the user name for display
    const displayName = userName?.trim() || requestingUser?.name || "Not provided";
    const displayEmail = trimmedEmail;

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #667eea; }
          .label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; }
          .value { font-size: 16px; color: #1f2937; margin-top: 4px; }
          .footer { margin-top: 20px; font-size: 12px; color: #9ca3af; text-align: center; }
          .action-btn { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">🔐 Password Reset Request</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">A user requires password assistance</p>
          </div>
          <div class="content">
            <p>A user has requested a password reset and requires administrator assistance.</p>
            
            <div class="info-box">
              <div class="label">Requester Email</div>
              <div class="value">${displayEmail}</div>
            </div>
            
            <div class="info-box">
              <div class="label">Requester Name</div>
              <div class="value">${displayName}</div>
            </div>
            
            <div class="info-box">
              <div class="label">Request Time (IST)</div>
              <div class="value">${requestTime}</div>
            </div>
            
            <p style="margin-top: 20px;">
              <strong>Action Required:</strong> Please log in to the RT-IT-Hub admin panel and reset this user's credentials using the Admin → Users section.
            </p>
          </div>
          <div class="footer">
            This is an automated message from RT-IT-Hub. Please do not reply directly to this email.
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email to valid admin emails only
    await sendEmailViaGraph(
      accessToken,
      validAdminEmails,
      `Password Reset Request - ${displayName} (${displayEmail})`,
      emailHtml
    );

    console.log(`Password reset notification sent to: ${validAdminEmails.join(", ")}`);

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent to administrators" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in notify-admin-password-reset:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "An unexpected error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
