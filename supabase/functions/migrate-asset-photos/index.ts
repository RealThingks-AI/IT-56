import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Simple hash function for URL dedup filenames
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch ALL assets with external assettiger.com URLs (no batch limit - we dedup)
    const { data: assets, error: fetchError } = await supabase
      .from("itam_assets")
      .select("id, asset_tag, custom_fields")
      .eq("is_active", true)
      .like("custom_fields->>photo_url", "%assettiger.com%")
      .limit(1000);

    if (fetchError) {
      throw new Error(`Failed to fetch assets: ${fetchError.message}`);
    }

    if (!assets || assets.length === 0) {
      return new Response(
        JSON.stringify({ message: "No external images remaining to migrate", uniqueImages: 0, totalAssetsUpdated: 0, failed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group assets by their photo_url for deduplication
    const urlToAssets = new Map<string, { id: string; asset_tag: string | null; custom_fields: any }[]>();
    for (const asset of assets) {
      const photoUrl = asset.custom_fields?.photo_url;
      if (!photoUrl) continue;
      if (!urlToAssets.has(photoUrl)) {
        urlToAssets.set(photoUrl, []);
      }
      urlToAssets.get(photoUrl)!.push(asset);
    }

    console.log(`Found ${assets.length} assets with ${urlToAssets.size} unique image URLs`);

    let uniqueImagesDownloaded = 0;
    let totalAssetsUpdated = 0;
    let failed = 0;
    const errors: { url: string; error: string }[] = [];

    for (const [originalUrl, linkedAssets] of urlToAssets) {
      try {
        // Download image once
        const response = await fetch(originalUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const contentType = response.headers.get("content-type") || "image/jpeg";
        const imageBuffer = await response.arrayBuffer();
        const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
        const urlHash = simpleHash(originalUrl);
        const fileName = `migrated/${urlHash}.${ext}`;

        // Upload once
        const { error: uploadError } = await supabase.storage
          .from("asset-photos")
          .upload(fileName, imageBuffer, { contentType, upsert: true });

        if (uploadError) throw new Error(`Upload: ${uploadError.message}`);

        const { data: urlData } = supabase.storage
          .from("asset-photos")
          .getPublicUrl(fileName);

        const newPublicUrl = urlData.publicUrl;
        uniqueImagesDownloaded++;

        // Update ALL assets that share this URL
        for (const asset of linkedAssets) {
          try {
            const updatedCustomFields = {
              ...asset.custom_fields,
              photo_url: newPublicUrl,
              original_photo_url: originalUrl,
            };

            const { error: updateError } = await supabase
              .from("itam_assets")
              .update({ custom_fields: updatedCustomFields })
              .eq("id", asset.id);

            if (updateError) throw new Error(`DB update ${asset.asset_tag}: ${updateError.message}`);
            totalAssetsUpdated++;
          } catch (assetErr) {
            failed++;
            errors.push({ url: originalUrl, error: `Asset ${asset.asset_tag}: ${assetErr instanceof Error ? assetErr.message : String(assetErr)}` });
          }
        }
      } catch (err) {
        failed += linkedAssets.length;
        errors.push({ url: originalUrl, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return new Response(JSON.stringify({
      uniqueImagesDownloaded,
      totalAssetsUpdated,
      failed,
      totalAssetsProcessed: assets.length,
      uniqueUrls: urlToAssets.size,
      errors: errors.slice(0, 20),
      message: "Migration complete!",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Migration error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
