import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Mail, LogIn, LogOut, Bell, Wrench, Clock, Shield, FileText, Save, Eye,
  RotateCcw, Loader2, CheckCircle2, XCircle, AlertCircle, Send, EyeOff,
  ExternalLink, MoreVertical, Copy, Download, Trash2, Activity,
  Settings2, ChevronLeft, ChevronRight, Filter,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────
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

interface EmailSettings {
  senderName: string;
  replyToEmail: string;
  sendCopyToAdmins: boolean;
  includeAssetPhoto: boolean;
  warrantyReminderDays: number;
  licenseExpiryReminderDays: number;
  overdueReturnCheckFrequency: string;
}

interface EmailLog {
  id: string;
  template_id: string;
  recipient_email: string;
  subject: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────
const defaultSettings: EmailSettings = {
  senderName: "IT Asset Management",
  replyToEmail: "",
  sendCopyToAdmins: false,
  includeAssetPhoto: true,
  warrantyReminderDays: 30,
  licenseExpiryReminderDays: 14,
  overdueReturnCheckFrequency: "daily",
};

const defaultTemplates: EmailTemplate[] = [
  {
    id: "checkout", name: "Checkout",
    subject: "Asset Checked Out: {{asset_name}}",
    body: `Hello {{user_name}},\n\nThe following asset has been checked out to you:\n\nAsset Name: {{asset_name}}\nAsset Tag: {{asset_tag}}\nCategory: {{category}}\nCheckout Date: {{checkout_date}}\nExpected Return: {{expected_return_date}}\n\nPlease take good care of this asset and return it by the expected date.\n\nBest regards,\nIT Asset Management Team`,
    enabled: true, icon: LogOut, description: "Sent when an asset is checked out to an employee",
    variables: ["user_name", "asset_name", "asset_tag", "category", "checkout_date", "expected_return_date"],
  },
  {
    id: "checkin", name: "Check-in",
    subject: "Asset Returned: {{asset_name}}",
    body: `Hello {{user_name}},\n\nThank you for returning the following asset:\n\nAsset Name: {{asset_name}}\nAsset Tag: {{asset_tag}}\nReturn Date: {{checkin_date}}\n\nThe asset has been successfully checked in.\n\nBest regards,\nIT Asset Management Team`,
    enabled: true, icon: LogIn, description: "Sent when an asset is returned by the employee",
    variables: ["user_name", "asset_name", "asset_tag", "checkin_date"],
  },
  {
    id: "warranty_expiring", name: "Warranty",
    subject: "Warranty Expiring Soon: {{asset_name}}",
    body: `Hello,\n\nThe warranty for the following asset is expiring soon:\n\nAsset Name: {{asset_name}}\nAsset Tag: {{asset_tag}}\nWarranty Expiry: {{warranty_expiry_date}}\nDays Remaining: {{days_remaining}}\n\nPlease review the warranty terms.\n\nBest regards,\nIT Asset Management Team`,
    enabled: true, icon: Shield, description: "Sent when an asset warranty is about to expire",
    variables: ["asset_name", "asset_tag", "warranty_expiry_date", "days_remaining"],
  },
  {
    id: "maintenance_due", name: "Maintenance",
    subject: "Maintenance Due: {{asset_name}}",
    body: `Hello,\n\nThe following asset is due for scheduled maintenance:\n\nAsset Name: {{asset_name}}\nAsset Tag: {{asset_tag}}\nMaintenance Type: {{maintenance_type}}\nDue Date: {{due_date}}\n\nPlease schedule the maintenance.\n\nBest regards,\nIT Asset Management Team`,
    enabled: true, icon: Wrench, description: "Sent when scheduled maintenance is due for an asset",
    variables: ["asset_name", "asset_tag", "maintenance_type", "due_date"],
  },
  {
    id: "overdue_return", name: "Overdue",
    subject: "Overdue Asset Return: {{asset_name}}",
    body: `Hello {{user_name}},\n\nThe following asset is overdue for return:\n\nAsset Name: {{asset_name}}\nAsset Tag: {{asset_tag}}\nExpected Return Date: {{expected_return_date}}\nDays Overdue: {{days_overdue}}\n\nPlease return this asset ASAP.\n\nBest regards,\nIT Asset Management Team`,
    enabled: true, icon: Clock, description: "Sent when an asset has not been returned by the due date",
    variables: ["user_name", "asset_name", "asset_tag", "expected_return_date", "days_overdue"],
  },
  {
    id: "license_expiring", name: "License",
    subject: "Software License Expiring: {{license_name}}",
    body: `Hello,\n\nThe following software license is expiring soon:\n\nLicense Name: {{license_name}}\nVendor: {{vendor_name}}\nExpiry Date: {{expiry_date}}\nDays Remaining: {{days_remaining}}\nSeats: {{seats_used}}/{{seats_total}}\n\nPlease review and renew.\n\nBest regards,\nIT Asset Management Team`,
    enabled: true, icon: FileText, description: "Sent when a software license is about to expire",
    variables: ["license_name", "vendor_name", "expiry_date", "days_remaining", "seats_used", "seats_total"],
  },
];

const iconMap: Record<string, any> = {
  checkout: LogOut, checkin: LogIn, warranty_expiring: Shield,
  maintenance_due: Wrench, overdue_return: Clock, license_expiring: FileText,
  
};

const automationTriggers = [
  { id: "warranty_expiring", label: "Warranty" },
  { id: "license_expiring", label: "License" },
  { id: "overdue_return", label: "Overdue" },
];

const LOGS_PER_PAGE = 25;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Preview Generator ──────────────────────────────────────────────
function generatePreviewHtml(body: string, subject: string, senderName: string, variables: string[]): string {
  let previewBody = body;
  let previewSubject = subject;
  const sampleValues: Record<string, string> = {
    user_name: "John Doe", asset_name: 'MacBook Pro 16"', asset_tag: "AST-000142",
    category: "Laptops", checkout_date: new Date().toLocaleDateString("en-GB"),
    expected_return_date: new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-GB"),
    checkin_date: new Date().toLocaleDateString("en-GB"),
    warranty_expiry_date: new Date(Date.now() + 60 * 86400000).toLocaleDateString("en-GB"),
    days_remaining: "60", maintenance_type: "Annual Service",
    due_date: new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-GB"),
    days_overdue: "5", license_name: "Microsoft 365 E3", vendor_name: "Microsoft",
    expiry_date: new Date(Date.now() + 14 * 86400000).toLocaleDateString("en-GB"),
    seats_used: "45", seats_total: "50",
    start_date: new Date(Date.now() + 2 * 86400000).toLocaleDateString("en-GB"),
    end_date: new Date(Date.now() + 5 * 86400000).toLocaleDateString("en-GB"),
    purpose: "Client Presentation",
  };
  variables.forEach(v => {
    const val = sampleValues[v] || `[${v}]`;
    previewBody = previewBody.replace(new RegExp(`\\{\\{${v}\\}\\}`, "g"), val);
    previewSubject = previewSubject.replace(new RegExp(`\\{\\{${v}\\}\\}`, "g"), val);
  });
  const htmlBody = previewBody.replace(/\n/g, "<br />");
  return `<!DOCTYPE html><html><head><style>
    body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;background:#f3f4f6}
    .c{max-width:600px;margin:20px auto}.h{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:16px;border-radius:8px 8px 0 0}
    .h h1{margin:0;font-size:16px}.s{padding:10px 20px;background:#fff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;font-size:12px;color:#6b7280}
    .s strong{color:#111827}.b{background:#fff;padding:20px;border:1px solid #e5e7eb;border-top:none;font-size:13px}
    .f{background:#f9fafb;padding:12px 20px;font-size:10px;color:#9ca3af;text-align:center;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px}
  </style></head><body><div class="c"><div class="h"><h1>📧 ${senderName}</h1></div>
  <div class="s"><strong>Subject:</strong> ${previewSubject}</div>
  <div class="b">${htmlBody}</div>
  <div class="f">Automated message from RT-IT-Hub</div></div></body></html>`;
}

// ─── Validation helpers ──────────────────────────────────────────────
function isTemplateValid(t: EmailTemplate): boolean {
  return t.subject.trim().length > 0 && t.body.trim().length > 0;
}

function hasAnyValidationError(templates: EmailTemplate[]): boolean {
  return templates.some(t => t.enabled && !isTemplateValid(t));
}

// ─── Component ───────────────────────────────────────────────────────
export function EmailsTab() {
  const queryClient = useQueryClient();
  const [templates, setTemplates] = useState<EmailTemplate[]>(defaultTemplates);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(defaultSettings);
  const [activeTemplate, setActiveTemplate] = useState("checkout");
  const [hasChanges, setHasChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showVariables, setShowVariables] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Dialog states
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  // Delivery logs filters & pagination
  const [logTemplateFilter, setLogTemplateFilter] = useState("all");
  const [logStatusFilter, setLogStatusFilter] = useState("all");
  const [logPage, setLogPage] = useState(1);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // ─── Queries ────────────────────────────────────────────────────
  const { data: connectionStatus, isLoading: isCheckingConnection, refetch: recheckConnection } = useQuery({
    queryKey: ["email-connection-status"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("send-asset-email", {
          body: { testMode: true },
        });
        if (error) return { success: false, error: error.message };
        return data as { success: boolean; error?: string; senderEmail?: string };
      } catch (e: any) {
        return { success: false, error: e.message || "Connection failed" };
      }
    },
    staleTime: 300000,
    retry: false,
  });

  const { data: savedConfigs, isLoading } = useQuery({
    queryKey: ["itam-email-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("itam_email_config").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: emailLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["itam-email-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_email_logs")
        .select("id, template_id, recipient_email, subject, status, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as EmailLog[];
    },
  });

  // Automation health
  const automationHealth = automationTriggers.map(trigger => {
    const lastLog = emailLogs.find(l => l.template_id === trigger.id);
    return { ...trigger, lastRun: lastLog?.created_at || null, lastStatus: lastLog?.status || null };
  });

  const [customizedTemplates, setCustomizedTemplates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!savedConfigs || savedConfigs.length === 0) return;
    const templateConfigs = savedConfigs.filter((c: any) => c.config_type === "template");
    const customized = new Set<string>();
    if (templateConfigs.length > 0) {
      setTemplates(prev =>
        prev.map(t => {
          const saved = templateConfigs.find((c: any) => c.config_key === t.id);
          if (saved) {
            customized.add(t.id);
            const val = saved.config_value as any;
            return { ...t, subject: val.subject ?? t.subject, body: val.body ?? t.body, enabled: val.enabled ?? t.enabled };
          }
          return t;
        })
      );
    }
    setCustomizedTemplates(customized);

    const settingsConfig = savedConfigs.find((c: any) => c.config_type === "settings" && c.config_key === "global_settings");
    if (settingsConfig) {
      const val = settingsConfig.config_value as any;
      setEmailSettings({
        senderName: val.senderName ?? defaultSettings.senderName,
        replyToEmail: val.replyToEmail ?? defaultSettings.replyToEmail,
        sendCopyToAdmins: val.sendCopyToAdmins ?? defaultSettings.sendCopyToAdmins,
        includeAssetPhoto: val.includeAssetPhoto ?? defaultSettings.includeAssetPhoto,
        warrantyReminderDays: val.warrantyReminderDays ?? defaultSettings.warrantyReminderDays,
        licenseExpiryReminderDays: val.licenseExpiryReminderDays ?? defaultSettings.licenseExpiryReminderDays,
        overdueReturnCheckFrequency: val.overdueReturnCheckFrequency ?? defaultSettings.overdueReturnCheckFrequency,
      });
    }
  }, [savedConfigs]);

  const currentTemplate = templates.find(t => t.id === activeTemplate) || templates[0];
  const currentValid = isTemplateValid(currentTemplate);
  const testEmailValid = EMAIL_REGEX.test(testEmailAddress);
  const enabledCount = templates.filter(t => t.enabled).length;

  // Filtered & paginated logs
  const filteredLogs = emailLogs.filter(log => {
    if (logTemplateFilter !== "all" && log.template_id !== logTemplateFilter) return false;
    if (logStatusFilter !== "all" && log.status !== logStatusFilter) return false;
    return true;
  });
  const totalLogPages = Math.max(1, Math.ceil(filteredLogs.length / LOGS_PER_PAGE));
  const paginatedLogs = filteredLogs.slice((logPage - 1) * LOGS_PER_PAGE, logPage * LOGS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setLogPage(1); }, [logTemplateFilter, logStatusFilter]);

  // Log summary stats
  const failedCount = emailLogs.filter(l => l.status === "failed").length;
  const lastSentLog = emailLogs.find(l => l.status === "sent");

  const updateTemplate = (id: string, updates: Partial<EmailTemplate>) => {
    setTemplates(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)));
    setHasChanges(true);
  };

  const updateEmailSettings = (updates: Partial<EmailSettings>) => {
    setEmailSettings(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const insertVariableAtCursor = useCallback(
    (variable: string) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        navigator.clipboard.writeText(`{{${variable}}}`);
        toast.success(`Copied {{${variable}}}`);
        return;
      }
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const insertion = `{{${variable}}}`;
      const newValue = text.substring(0, start) + insertion + text.substring(end);
      updateTemplate(activeTemplate, { body: newValue });
      requestAnimationFrame(() => {
        textarea.focus();
        const newPos = start + insertion.length;
        textarea.setSelectionRange(newPos, newPos);
      });
    },
    [activeTemplate]
  );

  // ─── Mutations ──────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const t of templates) {
        const { error } = await supabase.from("itam_email_config").upsert(
          {
            config_type: "template", config_key: t.id,
            config_value: { subject: t.subject, body: t.body, enabled: t.enabled } as any,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id,config_type,config_key" }
        );
        if (error) throw error;
      }
      const { error } = await supabase.from("itam_email_config").upsert(
        {
          config_type: "settings", config_key: "global_settings",
          config_value: emailSettings as any, updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,config_type,config_key" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Email configuration saved");
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["itam-email-config"] });
    },
    onError: (error: Error) => toast.error("Failed to save: " + error.message),
  });

  const sendTestMutation = useMutation({
    mutationFn: async () => {
      if (!testEmailAddress || !testEmailValid) throw new Error("Enter a valid email address");
      const { data, error } = await supabase.functions.invoke("send-asset-email", {
        body: { testMode: true, recipientEmail: testEmailAddress },
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || "Failed");
      return data;
    },
    onSuccess: () => {
      toast.success("Test email sent to " + testEmailAddress);
      refetchLogs();
    },
    onError: (error: Error) => {
      toast.error(error.message);
      refetchLogs();
    },
  });

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("itam_email_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Delivery logs cleared");
      setShowClearConfirm(false);
      refetchLogs();
    },
    onError: (error: Error) => {
      toast.error("Failed to clear logs: " + error.message);
      setShowClearConfirm(false);
    },
  });

  // ─── Template Actions ──────────────────────────────────────────
  const duplicateTemplate = (template: EmailTemplate) => {
    const newId = `${template.id}_copy_${Date.now()}`;
    const newTemplate: EmailTemplate = { ...template, id: newId, name: `Copy of ${template.name}`, enabled: false };
    setTemplates(prev => [...prev, newTemplate]);
    setActiveTemplate(newId);
    setHasChanges(true);
    toast.success(`Duplicated "${template.name}"`);
  };

  const exportTemplate = (template: EmailTemplate) => {
    const exportData = {
      id: template.id, name: template.name, subject: template.subject,
      body: template.body, enabled: template.enabled, variables: template.variables,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-template-${template.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template exported");
  };

  const resetTemplateToDefault = (templateId: string) => {
    const def = defaultTemplates.find(t => t.id === templateId);
    if (!def) { toast.error("No default available for this template"); return; }
    updateTemplate(templateId, { subject: def.subject, body: def.body, enabled: def.enabled });
    toast.info("Template reset to default. Save to persist.");
  };

  const handleSave = () => {
    if (hasAnyValidationError(templates)) {
      toast.error("Fix validation errors before saving (empty subject/body on enabled templates)");
      return;
    }
    saveMutation.mutate();
  };

  const handleReset = () => {
    setTemplates(defaultTemplates);
    setEmailSettings(defaultSettings);
    setHasChanges(true);
    toast.info("Reset to defaults. Save to persist.");
  };

  // ─── Loading ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const connectionConnected = connectionStatus?.success === true;
  const connectionError = connectionStatus?.success === false;
  const subjectEmpty = currentTemplate.subject.trim().length === 0;
  const bodyEmpty = currentTemplate.body.trim().length === 0;

  // Unique template IDs in logs for filter dropdown
  const logTemplateIds = [...new Set(emailLogs.map(l => l.template_id))];

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* ═══════════════════════════════════════════════════════════════
            ROW 1: Three Compact Summary Cards
           ═══════════════════════════════════════════════════════════════ */}
        <div className="rounded-lg border bg-card divide-y">
          {/* ── Email Provider Row ─────────────────────────────────── */}
          <div className="flex items-center gap-2 px-3 py-2">
            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-semibold shrink-0">Email Provider</span>
            {isCheckingConnection ? (
              <Badge variant="secondary" className="text-[9px] h-4">Checking…</Badge>
            ) : connectionConnected ? (
              <Badge className="text-[9px] h-4 bg-success/10 text-success border-success/20 hover:bg-success/10">Connected</Badge>
            ) : (
              <Badge variant="destructive" className="text-[9px] h-4">
                {connectionStatus?.error?.includes("not configured") ? "Not Configured" : "Error"}
              </Badge>
            )}
            {connectionConnected && (connectionStatus as any)?.senderEmail && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{(connectionStatus as any).senderEmail}</span>
            )}
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              <Button variant="outline" size="sm" onClick={() => recheckConnection()} disabled={isCheckingConnection} className="h-6 text-[10px] px-2">
                {isCheckingConnection ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                Test
              </Button>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={() => window.open("/admin/email", "_blank")}>
                <ExternalLink className="h-3 w-3" /> Configure
              </Button>
            </div>
          </div>

          {/* ── Delivery Logs Row ──────────────────────────────────── */}
          <div className="flex items-center gap-2 px-3 py-2">
            <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-semibold shrink-0">Delivery Logs</span>
            <span className="text-[10px] text-muted-foreground">
              Sent: <span className="font-medium text-foreground">{emailLogs.filter(l => l.status === "sent").length}</span>
              {" · "}Failed: <span className={`font-medium ${failedCount > 0 ? "text-destructive" : "text-foreground"}`}>{failedCount}</span>
              {" · "}Last: <span className="font-medium text-foreground">{lastSentLog ? new Date(lastSentLog.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}</span>
            </span>
            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 ml-auto shrink-0" onClick={() => setShowLogsDialog(true)}>
              View Logs
            </Button>
          </div>

          {/* ── Global Settings Row ────────────────────────────────── */}
          <div className="flex items-center gap-2 px-3 py-2">
            <Settings2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-semibold shrink-0">Settings</span>
            <span className="text-[10px] text-muted-foreground truncate">
              {emailSettings.senderName || "—"} · Reply: {emailSettings.replyToEmail || "Not set"} · CC: {emailSettings.sendCopyToAdmins ? "On" : "Off"}
            </span>
            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 ml-auto shrink-0" onClick={() => setShowSettingsDialog(true)}>
              Configure
            </Button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            ROW 2: Email Templates (full width, generous space)
           ═══════════════════════════════════════════════════════════════ */}
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <Tabs value={activeTemplate} onValueChange={setActiveTemplate}>
            <div className="flex items-center gap-2">
              <TabsList className="inline-flex h-7 items-center justify-start rounded-md bg-muted p-0.5 w-auto gap-0.5 overflow-x-auto min-w-0 flex-1">
              {templates.map(template => {
                const Icon = iconMap[template.id] || Mail;
                const valid = isTemplateValid(template);
                return (
                  <TabsTrigger key={template.id} value={template.id} title={template.description} className="shrink-0 gap-1 text-[11px] h-6 px-1.5">
                    <Icon className="h-3 w-3" />
                    {template.name}
                    {!template.enabled && <span className="text-[9px] text-muted-foreground ml-0.5">OFF</span>}
                    {template.enabled && !valid && <span className="w-1.5 h-1.5 rounded-full bg-destructive ml-0.5" />}
                    {template.enabled && valid && customizedTemplates.has(template.id) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary ml-0.5" />
                    )}
                  </TabsTrigger>
                );
              })}
              </TabsList>
              <div className="flex gap-1.5 shrink-0 ml-auto">
                <Button variant="outline" size="sm" onClick={handleReset} className="h-6 text-[10px] px-2">
                  <RotateCcw className="h-3 w-3 mr-1" /> Reset
                </Button>
                <Button
                  size="sm" onClick={handleSave}
                  disabled={!hasChanges || saveMutation.isPending || hasAnyValidationError(templates)}
                  className="h-6 text-[10px] px-2"
                >
                  {saveMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                  Save
                </Button>
              </div>
            </div>
            {templates.map(template => (
              <TabsContent key={template.id} value={template.id} className="mt-2 space-y-1.5">
                {/* Name + subject merged row */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Switch
                      checked={template.enabled}
                      onCheckedChange={checked => updateTemplate(template.id, { enabled: checked })}
                      className="scale-75"
                    />
                  </div>
                  <Input
                    value={template.subject}
                    onChange={e => updateTemplate(template.id, { subject: e.target.value })}
                    className={`text-xs h-7 flex-1 max-w-[400px] ${subjectEmpty && template.enabled ? "border-destructive" : ""}`}
                    placeholder="Subject line (required)"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => duplicateTemplate(template)} className="text-xs gap-2">
                        <Copy className="h-3 w-3" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportTemplate(template)} className="text-xs gap-2">
                        <Download className="h-3 w-3" /> Export JSON
                      </DropdownMenuItem>
                      {defaultTemplates.find(d => d.id === template.id) && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => resetTemplateToDefault(template.id)} className="text-xs gap-2">
                            <RotateCcw className="h-3 w-3" /> Reset to Default
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                

                {/* Body + Preview */}
                {/* Body + Preview */}
                <div className={`grid ${showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"} gap-3`}>
                  <div>
                    <Textarea
                      ref={textareaRef}
                      value={template.body}
                      onChange={e => updateTemplate(template.id, { body: e.target.value })}
                      className={`min-h-[400px] text-xs font-mono resize-y leading-relaxed ${bodyEmpty && template.enabled ? "border-destructive" : ""}`}
                      placeholder="Email body content (required)"
                    />
                    {bodyEmpty && template.enabled && (
                      <p className="text-[10px] text-destructive">Body is required</p>
                    )}
                  </div>
                  {showPreview && (
                    <div>
                      <div className="border rounded-md overflow-hidden bg-muted/20">
                        <iframe
                          srcDoc={generatePreviewHtml(template.body, template.subject, emailSettings.senderName, template.variables)}
                          className="w-full border-0" style={{ height: 400 }}
                          title="Email Preview" sandbox="allow-same-origin"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Toolbar: Preview toggle + Variables + Test email */}
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5 gap-1 text-muted-foreground" onClick={() => setShowPreview(p => !p)}>
                    {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showPreview ? "Hide Preview" : "Show Preview"}
                  </Button>
                  <div className="w-px h-4 bg-border" />
                  <Button
                    variant="ghost" size="sm"
                    className="h-6 text-[10px] px-1.5 gap-1 text-muted-foreground"
                    onClick={() => setShowVariables(v => !v)}
                  >
                    {showVariables ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showVariables ? "Hide Variables" : "Insert Variable"}
                  </Button>
                  <div className="w-px h-4 bg-border" />
                  <Input
                    type="email" placeholder="recipient@email.com"
                    value={testEmailAddress} onChange={e => setTestEmailAddress(e.target.value)}
                    className={`text-xs w-[180px] h-6 ${testEmailAddress && !testEmailValid ? "border-destructive" : ""}`}
                  />
                  <Button
                    size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1"
                    onClick={() => sendTestMutation.mutate()}
                    disabled={sendTestMutation.isPending || !testEmailValid || !connectionConnected}
                  >
                    {sendTestMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Send Test"}
                  </Button>
                </div>
                {showVariables && (
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map(variable => (
                      <Badge
                        key={variable} variant="outline"
                        className="text-[10px] cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors h-5 px-1.5 rounded-md"
                        onClick={() => insertVariableAtCursor(variable)}
                      >
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            DIALOG: Delivery Logs
           ═══════════════════════════════════════════════════════════════ */}
        <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Delivery Logs
                <Badge variant="secondary" className="text-[10px] h-5 ml-1">{emailLogs.length}</Badge>
              </DialogTitle>
              <DialogDescription>Recent email delivery history and status</DialogDescription>
            </DialogHeader>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <Select value={logTemplateFilter} onValueChange={setLogTemplateFilter}>
                <SelectTrigger className="text-xs h-7 w-[130px]">
                  <SelectValue placeholder="All templates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Templates</SelectItem>
                  {logTemplateIds.map(id => (
                    <SelectItem key={id} value={id} className="text-xs capitalize">{id.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={logStatusFilter} onValueChange={setLogStatusFilter}>
                <SelectTrigger className="text-xs h-7 w-[100px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Status</SelectItem>
                  <SelectItem value="sent" className="text-xs">Sent</SelectItem>
                  <SelectItem value="failed" className="text-xs">Failed</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-[10px] text-muted-foreground ml-auto">
                Showing {paginatedLogs.length} of {filteredLogs.length}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => refetchLogs()}>
                  <RotateCcw className="h-3 w-3" />
                </Button>
                {emailLogs.length > 0 && (
                  <Button
                    variant="ghost" size="sm" className="h-7 text-xs px-2 text-destructive hover:text-destructive"
                    onClick={() => setShowClearConfirm(true)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto min-h-0">
              {filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Mail className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground">No delivery logs found</p>
                </div>
              ) : (
                <Table wrapperClassName="border-0">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] h-7">Time</TableHead>
                      <TableHead className="text-[10px] h-7">Template</TableHead>
                      <TableHead className="text-[10px] h-7">Recipient</TableHead>
                      <TableHead className="text-[10px] h-7">Status</TableHead>
                      <TableHead className="text-[10px] h-7">Subject</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-[11px] py-1.5 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                        </TableCell>
                        <TableCell className="text-[11px] py-1.5">
                          <Badge variant="outline" className="text-[9px] h-4 capitalize">{log.template_id.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell className="text-[11px] py-1.5 max-w-[150px] truncate">{log.recipient_email}</TableCell>
                        <TableCell className="py-1.5">
                          {log.status === "sent" ? (
                            <Badge className="text-[9px] h-4 bg-success/10 text-success border-success/20 hover:bg-success/10">Sent</Badge>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="destructive" className="text-[9px] h-4 cursor-help">Failed</Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[300px] text-xs">
                                {log.error_message || "Unknown error"}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell className="text-[11px] py-1.5 max-w-[200px] truncate text-muted-foreground">
                          {log.subject || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Pagination */}
            {totalLogPages > 1 && (
              <div className="flex items-center justify-between pt-1 border-t">
                <span className="text-[10px] text-muted-foreground">
                  Page {logPage} of {totalLogPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline" size="sm" className="h-6 w-6 p-0"
                    onClick={() => setLogPage(p => Math.max(1, p - 1))}
                    disabled={logPage === 1}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline" size="sm" className="h-6 w-6 p-0"
                    onClick={() => setLogPage(p => Math.min(totalLogPages, p + 1))}
                    disabled={logPage === totalLogPages}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════════════
            DIALOG: Global Settings
           ═══════════════════════════════════════════════════════════════ */}
        <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Global Settings
              </DialogTitle>
              <DialogDescription>Sender configuration, automation triggers, and preferences</DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {/* Sender Configuration */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sender Configuration</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Sender Name</Label>
                    <Input
                      placeholder="IT Asset Management" className="text-xs h-8"
                      value={emailSettings.senderName}
                      onChange={e => updateEmailSettings({ senderName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Reply-To Email</Label>
                    <Input
                      placeholder="itam@company.com" className="text-xs h-8"
                      value={emailSettings.replyToEmail}
                      onChange={e => updateEmailSettings({ replyToEmail: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Automation Triggers */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Automation Triggers</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Warranty Reminder (days)</Label>
                    <Input
                      type="number" value={emailSettings.warrantyReminderDays}
                      onChange={e => updateEmailSettings({ warrantyReminderDays: parseInt(e.target.value) || 30 })}
                      className="text-xs h-8" min={1}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">License Expiry (days)</Label>
                    <Input
                      type="number" value={emailSettings.licenseExpiryReminderDays}
                      onChange={e => updateEmailSettings({ licenseExpiryReminderDays: parseInt(e.target.value) || 14 })}
                      className="text-xs h-8" min={1}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Overdue Check</Label>
                    <Select value={emailSettings.overdueReturnCheckFrequency} onValueChange={v => updateEmailSettings({ overdueReturnCheckFrequency: v })}>
                      <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preferences</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch checked={emailSettings.sendCopyToAdmins} onCheckedChange={checked => updateEmailSettings({ sendCopyToAdmins: checked })} className="scale-90" />
                    <div>
                      <span className="text-xs font-medium">CC Admins</span>
                      <p className="text-[10px] text-muted-foreground">Send a copy of all emails to admin users</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch checked={emailSettings.includeAssetPhoto} onCheckedChange={checked => updateEmailSettings({ includeAssetPhoto: checked })} className="scale-90" />
                    <div>
                      <span className="text-xs font-medium">Include Asset Photo</span>
                      <p className="text-[10px] text-muted-foreground">Attach the asset photo in notification emails</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowSettingsDialog(false)}>
                Cancel
              </Button>
              <Button
                size="sm" className="h-8 text-xs"
                onClick={() => { handleSave(); setShowSettingsDialog(false); }}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                Save Settings
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Clear Logs Confirmation */}
        <ConfirmDialog
          open={showClearConfirm}
          onOpenChange={setShowClearConfirm}
          onConfirm={() => clearLogsMutation.mutate()}
          title="Clear All Delivery Logs?"
          description="This will permanently delete all email delivery logs. This action cannot be undone."
          confirmText="Clear Logs"
          variant="destructive"
        />
      </div>
    </TooltipProvider>
  );
}
