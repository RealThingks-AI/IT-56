import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, type, value }: VerificationRequest = await req.json();

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    // Store verification code in database
    const { error: codeError } = await supabaseClient
      .from("recovery_verification_codes")
      .insert({
        user_id: userId,
        type,
        code: verificationCode,
        expires_at: expiresAt.toISOString(),
      });

    if (codeError) throw codeError;

    if (type === "email") {
      // For email verification, we would need Resend API
      // For now, just log the code
      console.log(`Verification code for ${value}: ${verificationCode}`);
      
      // TODO: Implement Resend email sending
      // const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
      // await resend.emails.send({
      //   from: "AppMaster <noreply@yourdomain.com>",
      //   to: [value],
      //   subject: "Verify your recovery email",
      //   html: `<p>Your verification code is: <strong>${verificationCode}</strong></p>
      //          <p>This code expires in 24 hours.</p>`,
      // });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email verification feature requires Resend API key configuration. Contact your administrator.",
          code: verificationCode // Remove in production
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else if (type === "phone") {
      // For SMS, you would need Twilio or similar service
      console.log(`SMS verification code for ${value}: ${verificationCode}`);
      
      // TODO: Implement Twilio SMS sending
      // const twilioClient = new Twilio(
      //   Deno.env.get("TWILIO_ACCOUNT_SID"),
      //   Deno.env.get("TWILIO_AUTH_TOKEN")
      // );
      // await twilioClient.messages.create({
      //   body: `Your AppMaster verification code is: ${verificationCode}`,
      //   from: Deno.env.get("TWILIO_PHONE_NUMBER"),
      //   to: value,
      // });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "SMS verification feature requires Twilio API key configuration. Contact your administrator.",
          code: verificationCode // Remove in production
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    throw new Error("Invalid verification type");

  } catch (error: any) {
    console.error("Error in send-recovery-verification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
