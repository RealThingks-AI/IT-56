import { useState, useMemo } from "react";
import { Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SampleAsset {
  asset_tag: string;
  description: string;
  brand: string;
  model: string;
  serial_number: string;
  photo_url: string | null;
}

const sampleAssets: SampleAsset[] = [
  { asset_tag: "RT-LTP-001", description: "Laptop", brand: "HP", model: "ProBook 440 G7", serial_number: "5CD013H6DO", photo_url: null },
  { asset_tag: "RT-KB-002", description: "Keyboard", brand: "Logitech", model: "K380", serial_number: "LG12345", photo_url: null },
];

function buildAssetTableHtml(assets: SampleAsset[]): string {
  const thStyle = `padding:8px 10px;text-align:left;font-size:12px;font-weight:600;color:#374151;border-bottom:2px solid #d1d5db;`;

  const headerRow = `<tr style="background:#f3f4f6;">
    <th style="${thStyle}">Asset Tag</th>
    <th style="${thStyle}">Description</th>
    <th style="${thStyle}">Brand</th>
    <th style="${thStyle}">Model</th>
    <th style="${thStyle}">Serial No</th>
    <th style="${thStyle}text-align:center;">Photo</th>
  </tr>`;

  const rows = assets
    .map((a, i) => {
      const bgColor = i % 2 === 0 ? "#ffffff" : "#f9fafb";
      const tdStyle = `padding:8px 10px;font-size:12px;border-bottom:1px solid #e5e7eb;color:#374151;background:${bgColor};`;
      return `<tr>
        <td style="${tdStyle}"><strong>${a.asset_tag}</strong></td>
        <td style="${tdStyle}">${a.description}</td>
        <td style="${tdStyle}">${a.brand}</td>
        <td style="${tdStyle}">${a.model}</td>
        <td style="${tdStyle}">S/N: ${a.serial_number}</td>
        <td style="${tdStyle}text-align:center;"><span style="color:#9ca3af;font-size:11px;">—</span></td>
      </tr>`;
    })
    .join("");

  return `<table style="border-collapse:collapse;width:100%;margin:16px 0;border:1px solid #d1d5db;border-radius:6px;overflow:hidden;">
    <thead>${headerRow}</thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildFullEmailHtml(type: "checkout" | "checkin"): string {
  const userName = "John Doe";
  const table = buildAssetTableHtml(sampleAssets);
  const actionText =
    type === "checkout"
      ? "The following items are in your possession:"
      : "The following items have been returned:";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 0; background: #f3f4f6; }
  .container { width: 100%; max-width: 800px; margin: 0 auto; padding: 12px; }
  .header { background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); color: white; padding: 12px 20px; border-radius: 8px 8px 0 0; }
  .content { background: #ffffff; padding: 16px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; font-size: 13px; }
  .footer { margin-top: 12px; font-size: 11px; color: #9ca3af; text-align: center; padding: 6px; }
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1 style="margin:0;font-size:16px;">&#128231; IT Asset Management</h1></div>
  <div class="content">
    <p style="margin:0 0 12px;">Hello <strong>${userName}</strong>,</p>
    <p style="margin:0 0 8px;">This is a confirmation email. ${actionText}</p>
    ${table}
    <p style="margin:12px 0 0;">Notes: <em>—</em></p>
    <br/>
    <p style="margin:0;">Thank you.</p>
    <br/>
    <p style="margin:0;">Best regards,<br/><strong>IT Team</strong></p>
  </div>
  <div class="footer">This is an automated message from RT-IT-Hub. Please do not reply directly.</div>
</div>
</body></html>`;
}

export function EmailTemplatePreview() {
  const [templateType, setTemplateType] = useState<"checkout" | "checkin">("checkout");
  const [refreshKey, setRefreshKey] = useState(0);

  const srcDoc = useMemo(
    () => buildFullEmailHtml(templateType),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [templateType, refreshKey]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Email Template Preview</h3>
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setRefreshKey((k) => k + 1)}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>
      <div className="rounded-lg border bg-card p-2.5 space-y-2">
        <Tabs value={templateType} onValueChange={(v) => setTemplateType(v as any)}>
          <TabsList className="w-auto">
            <TabsTrigger value="checkout" className="text-xs">Check Out</TabsTrigger>
            <TabsTrigger value="checkin" className="text-xs">Check In</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="rounded-md border overflow-hidden bg-muted/30">
          <iframe
            key={refreshKey + templateType}
            srcDoc={srcDoc}
            title="Email Template Preview"
            className="w-full border-0"
            style={{ minHeight: 300 }}
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
