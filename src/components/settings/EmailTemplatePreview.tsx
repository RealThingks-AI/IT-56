import { useState, useMemo } from "react";
import { SettingsCard } from "./SettingsCard";
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

  const rows = assets
    .map((a, i) => {
      const bgColor = i % 2 === 0 ? "#3a3a2a" : "#4a4a3a";
      const tdStyle = `padding: 10px 12px; font-size: 12px; border: 1px solid #d4a843; color: #e5e7eb; background: ${bgColor};`;
      return `<tr>
        <td style="${tdStyle}"><strong>${a.asset_tag}</strong></td>
        <td style="${tdStyle}">${a.description}</td>
        <td style="${tdStyle}">${a.brand}</td>
        <td style="${tdStyle}">${a.model}</td>
        <td style="${tdStyle}">S/N: ${a.serial_number}</td>
        <td style="${tdStyle} text-align:center;"><span style="color:#9ca3af;font-size:11px;">No photo</span></td>
      </tr>`;
    })
    .join("");

  return `<table style="border-collapse:collapse;width:100%;margin:16px 0;border:1px solid #d4a843;border-radius:8px;overflow:hidden;">
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

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:700px;margin:24px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:20px 28px;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">📧 IT Asset Management</h1>
    </div>
    <div style="padding:28px;background:#f9fafb;font-size:14px;color:#333;line-height:1.6;">
      <p style="margin:0 0 16px;">Hello <strong>${userName}</strong>,</p>
      <p style="margin:0 0 8px;">This is a confirmation email. ${actionText}</p>
      ${table}
      <p style="margin:16px 0 0;">Notes: <em>—</em></p>
      <br/>
      <p style="margin:0;">Thank you.</p>
      <br/>
      <p style="margin:0;">Best regards,<br/><strong>IT Team</strong></p>
    </div>
    <div style="background:#f4f4f0;padding:12px 28px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#999;">This is an automated message from RT-IT-Hub. Please do not reply directly.</p>
    </div>
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
    <SettingsCard
      title="Email Template Preview"
      description="Preview how asset check-in/check-out emails will look to recipients"
      icon={Eye}
      headerAction={
        <Button variant="ghost" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      }
    >
      <div className="space-y-4">
        <Tabs value={templateType} onValueChange={(v) => setTemplateType(v as any)}>
          <TabsList className="w-auto">
            <TabsTrigger value="checkout">Check Out</TabsTrigger>
            <TabsTrigger value="checkin">Check In</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="border rounded-lg overflow-hidden bg-muted/30">
          <iframe
            key={refreshKey + templateType}
            srcDoc={srcDoc}
            title="Email Template Preview"
            className="w-full border-0"
            style={{ minHeight: 520 }}
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </SettingsCard>
  );
}
