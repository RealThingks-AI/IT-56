import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALL_MODULE_TABLES: Record<string, string[]> = {
  Assets: ["itam_assets"],
  Tickets: ["helpdesk_tickets"],
};

// Active-only filters per table
const TABLE_FILTERS: Record<string, { column: string; value: boolean }> = {
  itam_assets: { column: "is_active", value: true },
  helpdesk_tickets: { column: "is_deleted", value: false },
};

const MAX_BACKUPS = 30;

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

    const body = await req.json();
    const { type, module_name, tables } = body as {
      type: "full" | "module";
      module_name?: string;
      tables: string[];
    };

    const tablesToBackup =
      type === "full"
        ? Object.values(ALL_MODULE_TABLES).flat()
        : tables || [];

    if (tablesToBackup.length === 0) {
      return new Response(
        JSON.stringify({ error: "No tables specified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const backupName =
      type === "full"
        ? `full-backup-${new Date().toISOString().replace(/[:.]/g, "-")}`
        : `${(module_name || "module").toLowerCase()}-backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;

    // Create backup record
    const { data: backupRecord, error: insertErr } = await supabaseAdmin
      .from("system_backups")
      .insert({
        backup_name: backupName,
        file_path: `backups/${backupName}.json`,
        backup_type: "manual",
        status: "in_progress",
        tables_included: tablesToBackup,
        created_by: userId,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr || !backupRecord) {
      throw new Error(`Failed to create backup record: ${insertErr?.message}`);
    }

    const backupId = backupRecord.id;

    // Export data from each table
    const backupData: Record<string, unknown[]> = {};
    let totalRecords = 0;

    for (const table of tablesToBackup) {
      let allRows: unknown[] = [];
      let from = 0;
      const batchSize = 1000;
      const filter = TABLE_FILTERS[table];
      while (true) {
        let query = supabaseAdmin
          .from(table)
          .select("*")
          .range(from, from + batchSize - 1);
        if (filter) {
          query = query.eq(filter.column, filter.value);
        }
        const { data, error } = await query;
        if (error) {
          console.error(`Error fetching ${table}:`, error.message);
          break;
        }
        if (!data || data.length === 0) break;
        allRows = allRows.concat(data);
        if (data.length < batchSize) break;
        from += batchSize;
      }
      backupData[table] = allRows;
      totalRecords += allRows.length;
    }

    const jsonStr = JSON.stringify(backupData);
    const encoder = new TextEncoder();
    const encoded = encoder.encode(jsonStr);

    // Compute checksum
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
    const checksum = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Upload to storage
    const filePath = `backups/${backupId}.json`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("system-backups")
      .upload(filePath, encoded, {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadErr) {
      await supabaseAdmin
        .from("system_backups")
        .update({ status: "failed", error_message: uploadErr.message })
        .eq("id", backupId);
      throw new Error(`Upload failed: ${uploadErr.message}`);
    }

    // Update backup record
    await supabaseAdmin
      .from("system_backups")
      .update({
        status: "completed",
        file_path: filePath,
        file_size: encoded.byteLength,
        record_count: totalRecords,
        checksum,
        completed_at: new Date().toISOString(),
        progress_percentage: 100,
      })
      .eq("id", backupId);

    // Enforce 30-record limit
    const { data: allBackups } = await supabaseAdmin
      .from("system_backups")
      .select("id, file_path")
      .order("created_at", { ascending: false });

    if (allBackups && allBackups.length > MAX_BACKUPS) {
      const toDelete = allBackups.slice(MAX_BACKUPS);
      for (const old of toDelete) {
        if (old.file_path) {
          await supabaseAdmin.storage.from("system-backups").remove([old.file_path]);
        }
        await supabaseAdmin.from("system_backups").delete().eq("id", old.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        backup_id: backupId,
        record_count: totalRecords,
        file_size: encoded.byteLength,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-backup error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
