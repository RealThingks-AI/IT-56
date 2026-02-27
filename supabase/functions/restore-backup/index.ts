import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map table names to their primary key column
const TABLE_PK: Record<string, string> = {
  itam_assets: "id",
  helpdesk_tickets: "id",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const { backup_id } = await req.json();
    if (!backup_id) {
      return new Response(JSON.stringify({ error: "backup_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get backup record
    const { data: backup, error: fetchErr } = await supabaseAdmin
      .from("system_backups")
      .select("*")
      .eq("id", backup_id)
      .single();

    if (fetchErr || !backup) {
      return new Response(JSON.stringify({ error: "Backup not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download backup file
    const { data: fileData, error: dlErr } = await supabaseAdmin.storage
      .from("system-backups")
      .download(backup.file_path);

    if (dlErr || !fileData) {
      throw new Error(`Failed to download backup: ${dlErr?.message}`);
    }

    const jsonText = await fileData.text();
    const backupData = JSON.parse(jsonText) as Record<string, unknown[]>;

    // Create restore log
    const { data: restoreLog } = await supabaseAdmin
      .from("backup_restore_logs")
      .insert({
        backup_id,
        restored_by: userId,
        status: "in_progress",
        tables_restored: Object.keys(backupData),
      })
      .select("id")
      .single();

    const recordsRestored: Record<string, number> = {};
    const errors: string[] = [];

    for (const [table, rows] of Object.entries(backupData)) {
      if (!Array.isArray(rows) || rows.length === 0) {
        recordsRestored[table] = 0;
        continue;
      }

      const pk = TABLE_PK[table] || "id";

      // Upsert in batches of 500
      const batchSize = 500;
      let restored = 0;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error: upsertErr } = await supabaseAdmin
          .from(table)
          .upsert(batch as Record<string, unknown>[], {
            onConflict: pk,
            ignoreDuplicates: false,
          });
        if (upsertErr) {
          errors.push(`${table}: ${upsertErr.message}`);
        } else {
          restored += batch.length;
        }
      }
      recordsRestored[table] = restored;
    }

    const status = errors.length > 0 ? "completed_with_errors" : "completed";

    if (restoreLog) {
      await supabaseAdmin
        .from("backup_restore_logs")
        .update({
          status,
          records_restored: recordsRestored,
          restored_at: new Date().toISOString(),
          error_message: errors.length > 0 ? errors.join("; ") : null,
        })
        .eq("id", restoreLog.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status,
        records_restored: recordsRestored,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("restore-backup error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
