import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Mail, LogIn, LogOut, Bell, Wrench, Clock, Shield, FileText, Save, Eye, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  enabled: boolean;
  icon: any;
  description: string;
  variables: string[];
}

const defaultTemplates: EmailTemplate[] = [
  {
    id: "checkout",
    name: "Asset Checkout",
    subject: "Asset Checked Out: {{asset_name}}",
    body: `Hello {{user_name}},

The following asset has been checked out to you:

Asset Name: {{asset_name}}
Asset Tag: {{asset_tag}}
Category: {{category}}
Checkout Date: {{checkout_date}}
Expected Return: {{expected_return_date}}

Please take good care of this asset and return it by the expected date.

If you have any questions, please contact your IT department.

Best regards,
IT Asset Management Team`,
    enabled: true,
    icon: LogOut,
    description: "Sent when an asset is checked out to an employee",
    variables: ["user_name", "asset_name", "asset_tag", "category", "checkout_date", "expected_return_date"]
  },
  {
    id: "checkin",
    name: "Asset Check-in",
    subject: "Asset Returned: {{asset_name}}",
    body: `Hello {{user_name}},

Thank you for returning the following asset:

Asset Name: {{asset_name}}
Asset Tag: {{asset_tag}}
Return Date: {{checkin_date}}

The asset has been successfully checked in to our inventory.

Best regards,
IT Asset Management Team`,
    enabled: true,
    icon: LogIn,
    description: "Sent when an asset is returned/checked in",
    variables: ["user_name", "asset_name", "asset_tag", "checkin_date"]
  },
  {
    id: "warranty_expiring",
    name: "Warranty Expiring",
    subject: "Warranty Expiring Soon: {{asset_name}}",
    body: `Hello,

This is a reminder that the warranty for the following asset is expiring soon:

Asset Name: {{asset_name}}
Asset Tag: {{asset_tag}}
Warranty Expiry: {{warranty_expiry_date}}
Days Remaining: {{days_remaining}}

Please review the warranty terms and consider renewal options if needed.

Best regards,
IT Asset Management Team`,
    enabled: true,
    icon: Shield,
    description: "Sent when an asset warranty is about to expire",
    variables: ["asset_name", "asset_tag", "warranty_expiry_date", "days_remaining"]
  },
  {
    id: "maintenance_due",
    name: "Maintenance Due",
    subject: "Maintenance Due: {{asset_name}}",
    body: `Hello,

The following asset is due for scheduled maintenance:

Asset Name: {{asset_name}}
Asset Tag: {{asset_tag}}
Maintenance Type: {{maintenance_type}}
Due Date: {{due_date}}

Please schedule the maintenance at your earliest convenience.

Best regards,
IT Asset Management Team`,
    enabled: true,
    icon: Wrench,
    description: "Sent when scheduled maintenance is due",
    variables: ["asset_name", "asset_tag", "maintenance_type", "due_date"]
  },
  {
    id: "overdue_return",
    name: "Overdue Return",
    subject: "Overdue Asset Return: {{asset_name}}",
    body: `Hello {{user_name}},

The following asset is overdue for return:

Asset Name: {{asset_name}}
Asset Tag: {{asset_tag}}
Expected Return Date: {{expected_return_date}}
Days Overdue: {{days_overdue}}

Please return this asset as soon as possible or contact your IT department if you need an extension.

Best regards,
IT Asset Management Team`,
    enabled: true,
    icon: Clock,
    description: "Sent when a checked-out asset is overdue for return",
    variables: ["user_name", "asset_name", "asset_tag", "expected_return_date", "days_overdue"]
  },
  {
    id: "license_expiring",
    name: "License Expiring",
    subject: "Software License Expiring: {{license_name}}",
    body: `Hello,

The following software license is expiring soon:

License Name: {{license_name}}
Vendor: {{vendor_name}}
Expiry Date: {{expiry_date}}
Days Remaining: {{days_remaining}}
Seats: {{seats_used}}/{{seats_total}}

Please review and renew the license if needed to avoid service interruption.

Best regards,
IT Asset Management Team`,
    enabled: true,
    icon: FileText,
    description: "Sent when a software license is about to expire",
    variables: ["license_name", "vendor_name", "expiry_date", "days_remaining", "seats_used", "seats_total"]
  },
  {
    id: "reservation_reminder",
    name: "Reservation Reminder",
    subject: "Asset Reservation Reminder: {{asset_name}}",
    body: `Hello {{user_name}},

This is a reminder about your upcoming asset reservation:

Asset Name: {{asset_name}}
Asset Tag: {{asset_tag}}
Reservation Start: {{start_date}}
Reservation End: {{end_date}}
Purpose: {{purpose}}

Please collect the asset on the start date from the IT department.

Best regards,
IT Asset Management Team`,
    enabled: false,
    icon: Bell,
    description: "Sent as a reminder before a reservation starts",
    variables: ["user_name", "asset_name", "asset_tag", "start_date", "end_date", "purpose"]
  }
];

export function EmailsTab() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(defaultTemplates);
  const [activeTemplate, setActiveTemplate] = useState("checkout");
  const [hasChanges, setHasChanges] = useState(false);

  const currentTemplate = templates.find(t => t.id === activeTemplate) || templates[0];

  const updateTemplate = (id: string, updates: Partial<EmailTemplate>) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    setHasChanges(true);
  };

  const handleSave = () => {
    // In a real app, this would save to the database
    toast.success("Email templates saved successfully");
    setHasChanges(false);
  };

  const handleReset = () => {
    setTemplates(defaultTemplates);
    setHasChanges(false);
    toast.info("Templates reset to defaults");
  };

  const handlePreview = () => {
    // Create a preview with sample data
    let preview = currentTemplate.body;
    currentTemplate.variables.forEach(v => {
      preview = preview.replace(new RegExp(`{{${v}}}`, 'g'), `[${v.replace(/_/g, ' ').toUpperCase()}]`);
    });
    
    // Open in new window
    const previewWindow = window.open('', '_blank', 'width=600,height=600');
    if (previewWindow) {
      previewWindow.document.write(`
        <html>
          <head>
            <title>Email Preview - ${currentTemplate.name}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
              .subject { font-weight: bold; font-size: 18px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #ccc; }
              .body { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <div class="subject">Subject: ${currentTemplate.subject.replace(/{{(\w+)}}/g, '[$1]')}</div>
            <div class="body">${preview}</div>
          </body>
        </html>
      `);
      previewWindow.document.close();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Templates
            </CardTitle>
            <CardDescription className="text-xs">
              Configure email notification templates for various asset events
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-3 w-3 mr-2" />
              Reset
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!hasChanges}>
              <Save className="h-3 w-3 mr-2" />
              Save Changes
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTemplate} onValueChange={setActiveTemplate}>
            <ScrollArea className="w-full whitespace-nowrap">
              <TabsList className="inline-flex h-9 items-center justify-start rounded-md bg-muted p-1 w-auto">
                {templates.map(template => {
                  const Icon = template.icon;
                  return (
                    <TabsTrigger key={template.id} value={template.id} className="shrink-0 gap-1.5 text-xs">
                      <Icon className="h-3 w-3" />
                      {template.name}
                      {!template.enabled && (
                        <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">Off</Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {templates.map(template => (
              <TabsContent key={template.id} value={template.id} className="mt-4 space-y-4">
                {/* Header with enable toggle */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{template.name}</p>
                    <p className="text-xs text-muted-foreground">{template.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`enable-${template.id}`} className="text-xs">
                      {template.enabled ? "Enabled" : "Disabled"}
                    </Label>
                    <Switch
                      id={`enable-${template.id}`}
                      checked={template.enabled}
                      onCheckedChange={(checked) => updateTemplate(template.id, { enabled: checked })}
                    />
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label className="text-xs">Email Subject</Label>
                  <Input
                    value={template.subject}
                    onChange={(e) => updateTemplate(template.id, { subject: e.target.value })}
                    placeholder="Email subject line"
                    className="text-sm"
                  />
                </div>

                {/* Body */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Email Body</Label>
                    <Button variant="outline" size="sm" onClick={handlePreview}>
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                  </div>
                  <Textarea
                    value={template.body}
                    onChange={(e) => updateTemplate(template.id, { body: e.target.value })}
                    placeholder="Email body content"
                    className="min-h-[250px] text-sm font-mono"
                  />
                </div>

                {/* Available Variables */}
                <div className="space-y-2">
                  <Label className="text-xs">Available Variables</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {template.variables.map(variable => (
                      <Badge 
                        key={variable} 
                        variant="outline" 
                        className="text-xs cursor-pointer hover:bg-muted"
                        onClick={() => {
                          navigator.clipboard.writeText(`{{${variable}}}`);
                          toast.success(`Copied {{${variable}}} to clipboard`);
                        }}
                      >
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click a variable to copy it. Use these placeholders in your subject and body.
                  </p>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Email Settings</CardTitle>
          <CardDescription className="text-xs">
            Configure global email notification settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Sender Name</Label>
              <Input placeholder="IT Asset Management" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Reply-To Email</Label>
              <Input placeholder="itam@company.com" className="text-sm" />
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Send copy to administrators</Label>
                <p className="text-xs text-muted-foreground">Send a copy of all emails to admin users</p>
              </div>
              <Switch />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Include asset photo</Label>
                <p className="text-xs text-muted-foreground">Attach asset photo in checkout/checkin emails</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Warranty reminder days</Label>
                <p className="text-xs text-muted-foreground">Days before expiry to send reminder</p>
              </div>
              <Input type="number" defaultValue={30} className="w-20 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
