import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SettingsCard } from "./SettingsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, CheckCircle2, XCircle, Loader2, TestTube, Settings2, Save, Eye, EyeOff } from "lucide-react";
import { EmailTemplatePreview } from "./EmailTemplatePreview";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AzureCredentials {
  tenant_id: string;
  client_id: string;
  client_secret: string;
  sender_email: string;
}

export function EmailCenter() {
  const queryClient = useQueryClient();

  // Azure credentials state
  const [creds, setCreds] = useState<AzureCredentials>({
    tenant_id: "",
    client_id: "",
    client_secret: "",
    sender_email: "",
  });
  const [showSecret, setShowSecret] = useState(false);

  // Connection test state
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "connected" | "error">("unknown");
  const [connectionError, setConnectionError] = useState("");
  const [detectedSender, setDetectedSender] = useState("");

  // Test email state
  const [testEmail, setTestEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Load saved credentials
  const { data: savedCreds, isLoading: isLoadingCreds } = useQuery({
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

  // Save credentials mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Check if row exists
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
    <div className="space-y-6">
      {/* Azure Credentials Management */}
      <SettingsCard
        title="Microsoft Graph API Credentials"
        description="Enter your Azure AD application credentials to enable email sending via Microsoft 365"
        icon={Settings2}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="azure-tenant" className="text-xs">Azure Tenant ID</Label>
              <Input
                id="azure-tenant"
                value={creds.tenant_id}
                onChange={(e) => setCreds(p => ({ ...p, tenant_id: e.target.value }))}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="azure-client" className="text-xs">Client ID</Label>
              <Input
                id="azure-client"
                value={creds.client_id}
                onChange={(e) => setCreds(p => ({ ...p, client_id: e.target.value }))}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="azure-secret" className="text-xs">Client Secret</Label>
              <div className="relative">
                <Input
                  id="azure-secret"
                  type={showSecret ? "text" : "password"}
                  value={creds.client_secret}
                  onChange={(e) => setCreds(p => ({ ...p, client_secret: e.target.value }))}
                  placeholder="Enter client secret"
                  className="font-mono text-xs pr-9"
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
            <div className="space-y-1.5">
              <Label htmlFor="azure-sender" className="text-xs">Sender Email</Label>
              <Input
                id="azure-sender"
                type="email"
                value={creds.sender_email}
                onChange={(e) => setCreds(p => ({ ...p, sender_email: e.target.value }))}
                placeholder="noreply@company.com"
                className="text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !hasAllCreds}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Credentials
            </Button>
            {!hasAllCreds && (
              <span className="text-xs text-muted-foreground">Fill all fields to save</span>
            )}
          </div>
        </div>
      </SettingsCard>

      {/* Connection Test */}
      <SettingsCard
        title="Connection Status"
        description="Test your Microsoft Graph API connection"
        icon={Mail}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {connectionStatus === "connected" && (
              <Badge variant="default" className="gap-1.5 bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </Badge>
            )}
            {connectionStatus === "error" && (
              <Badge variant="destructive" className="gap-1.5">
                <XCircle className="h-3 w-3" />
                Error
              </Badge>
            )}
            {connectionStatus === "unknown" && (
              <Badge variant="secondary" className="gap-1.5">
                Not tested
              </Badge>
            )}
            {detectedSender && (
              <span className="text-sm text-muted-foreground">
                Sender: <strong>{detectedSender}</strong>
              </span>
            )}
          </div>

          {connectionError && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {connectionError}
            </p>
          )}

          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTestingConnection}
          >
            {isTestingConnection ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Settings2 className="h-4 w-4 mr-2" />
            )}
            Test Connection
          </Button>
        </div>
      </SettingsCard>

      {/* Send Test Email */}
      <SettingsCard
        title="Send Test Email"
        description="Verify email delivery by sending a test message"
        icon={TestTube}
      >
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="test-email" className="text-xs">Recipient Email</Label>
            <Input
              id="test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="user@company.com"
            />
          </div>
          <Button onClick={handleSendTestEmail} disabled={isSendingTest || !testEmail}>
            {isSendingTest ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Test
          </Button>
        </div>
      </SettingsCard>

      {/* Email Template Preview */}
      <EmailTemplatePreview />
    </div>
  );
}
