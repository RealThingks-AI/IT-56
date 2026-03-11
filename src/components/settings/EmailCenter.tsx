import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Send, CheckCircle2, XCircle, Loader2, TestTube, Settings2, Save, Eye, EyeOff, RefreshCw, History } from "lucide-react";
import { EmailTemplatePreview } from "./EmailTemplatePreview";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface AzureCredentials {
  tenant_id: string;
  client_id: string;
  client_secret: string;
  sender_email: string;
}

export function EmailCenter() {
  const queryClient = useQueryClient();

  const [creds, setCreds] = useState<AzureCredentials>({
    tenant_id: "", client_id: "", client_secret: "", sender_email: "",
  });
  const [showSecret, setShowSecret] = useState(false);

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "connected" | "error">("unknown");
  const [connectionError, setConnectionError] = useState("");
  const [detectedSender, setDetectedSender] = useState("");

  const [testEmail, setTestEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  const { data: savedCreds } = useQuery({
    queryKey: ["azure-credentials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_email_config")
        .select("config_value")
        .eq("config_type", "azure_credentials")
        .eq("config_key", "azure_config")
        .maybeSingle();
      return (data?.config_value as any as AzureCredentials) || null;
    },
  });

  useEffect(() => {
    if (savedCreds) {
      setCreds({
        tenant_id: savedCreds.tenant_id || "",
        client_id: savedCreds.client_id || "",
        client_secret: savedCreds.client_secret || "",
        sender_email: savedCreds.sender_email || "",
      });
    }
  }, [savedCreds]);

  const { data: emailLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["email-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_email_logs")
        .select("id, recipient_email, template_id, status, subject, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: existing } = await supabase
        .from("itam_email_config")
        .select("id")
        .eq("config_type", "azure_credentials")
        .eq("config_key", "azure_config")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("itam_email_config")
          .update({ config_value: creds as any, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("itam_email_config")
          .insert({
            config_type: "azure_credentials",
            config_key: "azure_config",
            config_value: creds as any,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Azure credentials saved");
      queryClient.invalidateQueries({ queryKey: ["azure-credentials"] });
    },
    onError: () => toast.error("Failed to save credentials"),
  });

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus("unknown");
    setConnectionError("");
    try {
      const { data, error } = await supabase.functions.invoke("send-asset-email", {
        body: { testMode: true },
      });
      if (error) throw error;
      if (data?.success) {
        setConnectionStatus("connected");
        setDetectedSender(data.senderEmail || "");
        toast.success("Microsoft Graph API connected successfully");
      } else {
        setConnectionStatus("error");
        setConnectionError(data?.error || "Unknown error");
        toast.error("Connection failed: " + (data?.error || "Unknown error"));
      }
    } catch (err: any) {
      setConnectionStatus("error");
      setConnectionError(err.message || "Failed to reach edge function");
      toast.error("Connection test failed");
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error("Please enter an email address");
      return;
    }
    setIsSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-asset-email", {
        body: { testMode: true, recipientEmail: testEmail },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success("Test email sent to " + testEmail);
        refetchLogs();
      } else {
        toast.error("Failed: " + (data?.error || "Unknown error"));
      }
    } catch (err: any) {
      toast.error("Failed to send test email: " + err.message);
    } finally {
      setIsSendingTest(false);
    }
  };

  const hasAllCreds = creds.tenant_id && creds.client_id && creds.client_secret && creds.sender_email;

  return (
    <div className="space-y-2.5">
      {/* Azure Credentials */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Microsoft Graph API Credentials</h3>
        </div>
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="azure-tenant" className="text-xs">Azure Tenant ID</Label>
              <Input
                id="azure-tenant"
                value={creds.tenant_id}
                onChange={(e) => setCreds(p => ({ ...p, tenant_id: e.target.value }))}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="h-7 font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="azure-client" className="text-xs">Client ID</Label>
              <Input
                id="azure-client"
                value={creds.client_id}
                onChange={(e) => setCreds(p => ({ ...p, client_id: e.target.value }))}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="h-7 font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="azure-secret" className="text-xs">Client Secret</Label>
              <div className="relative">
                <Input
                  id="azure-secret"
                  type={showSecret ? "text" : "password"}
                  value={creds.client_secret}
                  onChange={(e) => setCreds(p => ({ ...p, client_secret: e.target.value }))}
                  placeholder="Enter client secret"
                  className="h-7 font-mono text-xs pr-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-9"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="azure-sender" className="text-xs">Sender Email</Label>
              <Input
                id="azure-sender"
                type="email"
                value={creds.sender_email}
                onChange={(e) => setCreds(p => ({ ...p, sender_email: e.target.value }))}
                placeholder="noreply@company.com"
                className="h-7 text-xs"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !hasAllCreds}
            >
              {saveMutation.isPending ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Save Credentials
            </Button>
            {!hasAllCreds && (
              <span className="text-[10px] text-muted-foreground">Fill all fields to save</span>
            )}
          </div>
        </div>
      </div>

      {/* Connection & Testing — merged */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <TestTube className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Connection & Testing</h3>
        </div>
        <div className="rounded-lg border bg-card p-3 space-y-2">
          {/* Connection status row */}
          <div className="flex items-center gap-2 flex-wrap">
            {connectionStatus === "connected" && (
              <Badge variant="default" className="gap-1 text-[10px] bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </Badge>
            )}
            {connectionStatus === "error" && (
              <Badge variant="destructive" className="gap-1 text-[10px]">
                <XCircle className="h-3 w-3" /> Error
              </Badge>
            )}
            {connectionStatus === "unknown" && (
              <Badge variant="secondary" className="gap-1 text-[10px]">Not tested</Badge>
            )}
            {detectedSender && (
              <span className="text-xs text-muted-foreground">
                Sender: <strong>{detectedSender}</strong>
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs ml-auto"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
            >
              {isTestingConnection ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Settings2 className="h-3.5 w-3.5 mr-1.5" />}
              Test Connection
            </Button>
          </div>

          {connectionError && (
            <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-md">{connectionError}</p>
          )}

          {/* Send test email row */}
          <div className="flex gap-2 items-end border-t border-border">
            <div className="flex-1 space-y-1">
              <Label htmlFor="test-email" className="text-xs">Send Test Email</Label>
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="user@company.com"
                className="h-7 text-xs"
              />
            </div>
            <Button size="sm" className="h-7 text-xs" onClick={handleSendTestEmail} disabled={isSendingTest || !testEmail}>
              {isSendingTest ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
              Send Test
            </Button>
          </div>
        </div>
      </div>

      {/* Email Logs */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Email Delivery Log</h3>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => refetchLogs()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
        {emailLogs && emailLogs.length > 0 ? (
          <ScrollArea className="max-h-[300px] rounded-md border">
            <Table>
              <colgroup>
                <col className="w-[180px]" />
                <col className="w-[100px]" />
                <col />
                <col className="w-[80px]" />
                <col className="w-[140px]" />
              </colgroup>
              <TableHeader className="sticky top-0 bg-muted shadow-sm z-10">
                <TableRow>
                  <TableHead className="text-xs py-1">Recipient</TableHead>
                  <TableHead className="text-xs py-1">Template</TableHead>
                  <TableHead className="text-xs py-1">Subject</TableHead>
                  <TableHead className="text-xs py-1">Status</TableHead>
                  <TableHead className="text-xs py-1">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-mono truncate max-w-[180px] py-1">{log.recipient_email}</TableCell>
                    <TableCell className="py-1">
                      <Badge variant="outline" className="text-[10px] capitalize">{log.template_id}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[200px] py-1">{log.subject || "—"}</TableCell>
                    <TableCell className="py-1">
                      {log.status === "sent" ? (
                        <Badge variant="default" className="text-[10px] bg-green-600 hover:bg-green-700 gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Sent
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <XCircle className="h-2.5 w-2.5" /> Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-1">
                      {log.created_at ? format(new Date(log.created_at), "dd MMM yyyy HH:mm") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">No email logs yet. Send a test email to see delivery history.</p>
          </div>
        )}
      </div>

      {/* Email Template Preview */}
      <EmailTemplatePreview />
    </div>
  );
}
