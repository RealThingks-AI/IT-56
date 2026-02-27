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

    // --- PHASE 1: Migrate remaining external URLs ---
    const { data: externalAssets } = await supabase
      .from("itam_assets")
      .select("id, asset_tag, custom_fields")
      .eq("is_active", true)
      .like("custom_fields->>photo_url", "%assettiger.com%")
      .limit(1000);

    let remigratedCount = 0;
    const remigrationErrors: string[] = [];

    if (externalAssets && externalAssets.length > 0) {
      // Group by URL for dedup
      const urlGroups = new Map<string, typeof externalAssets>();
      for (const a of externalAssets) {
        const url = a.custom_fields?.photo_url;
        if (!url) continue;
        if (!urlGroups.has(url)) urlGroups.set(url, []);
        urlGroups.get(url)!.push(a);
      }

      for (const [extUrl, assets] of urlGroups) {
        try {
          const resp = await fetch(extUrl);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const buf = await resp.arrayBuffer();
          const hash = await sha256Hex(buf);
          const contentType = resp.headers.get("content-type") || "image/jpeg";
          const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
          const fileName = `migrated/${hash}.${ext}`;

          await supabase.storage.from("asset-photos").upload(fileName, buf, { contentType, upsert: true });
          const { data: urlData } = supabase.storage.from("asset-photos").getPublicUrl(fileName);
          const newUrl = urlData.publicUrl;

          for (const asset of assets) {
            const updated = { ...asset.custom_fields, photo_url: newUrl, original_photo_url: extUrl };
            await supabase.from("itam_assets").update({ custom_fields: updated }).eq("id", asset.id);
            remigratedCount++;
          }
        } catch (e) {
          remigrationErrors.push(`${extUrl}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    // --- PHASE 2: Get all referenced photo_urls from DB ---
    const { data: allAssets } = await supabase
      .from("itam_assets")
      .select("custom_fields")
      .not("custom_fields->>photo_url", "is", null)
      .limit(5000);

    const referencedUrls = new Set<string>();
    if (allAssets) {
      for (const a of allAssets) {
        const url = (a.custom_fields as Record<string, unknown>)?.photo_url as string;
        if (url) referencedUrls.add(url);
      }
    }
    console.log(`Found ${referencedUrls.size} distinct referenced URLs in DB`);

    // --- PHASE 3: List all storage files and delete orphans ---
    const allFiles: { name: string; path: string; url: string }[] = [];
    const listFiles = async (prefix: string) => {
      const { data } = await supabase.storage.from("asset-photos").list(prefix, { limit: 1000 });
      if (!data) return;
      for (const item of data) {
        if (item.name === ".emptyFolderPlaceholder") continue;
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.id === null) {
          await listFiles(fullPath);
          continue;
        }
        const ext = item.name.toLowerCase().split(".").pop();
        if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) {
          const { data: urlData } = supabase.storage.from("asset-photos").getPublicUrl(fullPath);
          allFiles.push({ name: item.name, path: fullPath, url: urlData.publicUrl });
        }
      }
    };
    await listFiles("migrated");
    console.log(`Found ${allFiles.length} files in storage`);

    // Delete orphans in batches of 20
    let orphansDeleted = 0;
    const orphanErrors: string[] = [];
    const orphanPaths: string[] = [];

    for (const file of allFiles) {
      if (!referencedUrls.has(file.url)) {
        orphanPaths.push(file.path);
      }
    }
    console.log(`Found ${orphanPaths.length} orphaned files to delete`);

    // Delete in batches
    const BATCH_SIZE = 20;
    for (let i = 0; i < orphanPaths.length; i += BATCH_SIZE) {
      const batch = orphanPaths.slice(i, i + BATCH_SIZE);
      try {
        const { error } = await supabase.storage.from("asset-photos").remove(batch);
        if (error) {
          orphanErrors.push(`Batch ${i}: ${error.message}`);
        } else {
          orphansDeleted += batch.length;
        }
      } catch (e) {
        orphanErrors.push(`Batch ${i}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Deduplication & cleanup complete",
        phase1_remigrated: remigratedCount,
        phase1_errors: remigrationErrors.slice(0, 10),
        referencedUrlsInDB: referencedUrls.size,
        totalStorageFiles: allFiles.length,
        orphansDeleted,
        orphanErrors: orphanErrors.slice(0, 10),
        remainingFiles: allFiles.length - orphansDeleted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Dedup error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
