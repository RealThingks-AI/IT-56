import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Download, Key, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function UpdateSettings() {
  const [apiKey, setApiKey] = useState("");

  const { data: orgData, isLoading } = useQuery({
    queryKey: ["org-settings"],
    queryFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('Not authenticated');

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('organisation_id, organisations(name)')
        .eq('auth_user_id', authData.user.id)
        .single();

      if (userError) throw userError;
      return userData as { 
        organisation_id: string;
        organisations: { name: string } | null;
      };
    },
  });

  const handleCopyApiKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      toast.success("API key copied to clipboard");
    } else {
      toast.error("Please generate an API key first");
    }
  };

  const handleCopyOrgId = () => {
    if (orgData?.organisation_id) {
      navigator.clipboard.writeText(orgData.organisation_id);
      toast.success("Organisation ID copied to clipboard");
    }
  };

  const handleGenerateApiKey = () => {
    const newKey = `rtithub_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setApiKey(newKey);
    toast.success("New API key generated");
  };

  const handleDownloadAgent = () => {
    const link = document.createElement('a');
    link.href = '/device-update-agent.ps1';
    link.download = 'device-update-agent.ps1';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Agent downloaded successfully");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Update Settings</h1>
        <p className="text-muted-foreground">
          Configure system update preferences and download the device agent
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Device Agent API Key
            </CardTitle>
            <CardDescription>
              Generate an API key for your device update agents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="api-key"
                  type="text"
                  value={apiKey}
                  placeholder="Click generate to create an API key"
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyApiKey}
                  disabled={!apiKey}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button onClick={handleGenerateApiKey} className="w-full">
              Generate New API Key
            </Button>
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              <strong>Important:</strong> Save this API key securely. You'll need it to configure
              the device agent on your machines.
            </div>
          </CardContent>
        </Card>

        {/* Organization ID */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organisation Configuration
            </CardTitle>
            <CardDescription>
              Your organisation details for device registration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Organisation Name</Label>
              <Input
                type="text"
                value={orgData?.organisations?.name || 'Unknown'}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-id">Organisation ID</Label>
              <div className="flex gap-2">
                <Input
                  id="org-id"
                  type="text"
                  value={orgData?.organisation_id || ''}
                  readOnly
                  className="font-mono text-sm bg-muted"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyOrgId}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              This ID is required to link devices to your organisation. Copy it to configure
              your device agent.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Device Agent Download */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Device Update Agent
          </CardTitle>
          <CardDescription>
            Download and deploy the PowerShell agent to devices for automated update tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <h4 className="font-semibold">Setup Instructions:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Generate an API key above if you haven't already</li>
              <li>Copy your Organisation ID</li>
              <li>Download the device-update-agent.ps1 script below</li>
              <li>Edit the script and replace:
                <ul className="list-disc list-inside ml-6 mt-1">
                  <li><code className="bg-background px-1 py-0.5 rounded">YOUR_API_KEY_HERE</code> with your API key</li>
                  <li><code className="bg-background px-1 py-0.5 rounded">YOUR_ORG_ID_HERE</code> with your Organisation ID</li>
                </ul>
              </li>
              <li>Run PowerShell as Administrator on target machines</li>
              <li>Execute: <code className="bg-background px-1 py-0.5 rounded">.\device-update-agent.ps1</code></li>
              <li>Schedule it to run regularly (e.g., daily) using Task Scheduler</li>
            </ol>
          </div>
          <Button onClick={handleDownloadAgent} className="w-full" size="lg">
            <Download className="h-4 w-4 mr-2" />
            Download device-update-agent.ps1
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
