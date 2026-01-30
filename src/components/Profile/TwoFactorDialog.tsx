import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, QrCode, Key, CheckCircle2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TwoFactorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TwoFactorDialog = ({
  open,
  onOpenChange,
}: TwoFactorDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [step, setStep] = useState<"info" | "setup" | "verify">("info");

  // Fetch MFA status
  const { data: mfaSettings, isLoading } = useQuery({
    queryKey: ["mfa-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("user_mfa_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  // Enroll MFA
  const enrollMfaMutation = useMutation({
    mutationFn: async () => {
      // Get current session to ensure user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        throw new Error("User not authenticated. Please log in again.");
      }

      // First, clean up any existing factors and database settings
      const { data: factors } = await supabase.auth.mfa.listFactors();
      
      if (factors?.totp && factors.totp.length > 0) {
        // Wait for all factors to be unenrolled
        await Promise.all(
          factors.totp.map(factor =>
            supabase.auth.mfa.unenroll({ factorId: factor.id })
              .catch(err => console.error("Error unenrolling factor:", err))
          )
        );
      }

      // Clean up database settings
      await supabase
        .from("user_mfa_settings")
        .delete()
        .eq("user_id", session.user.id);

      // Wait a bit to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Now enroll a new factor with a unique friendly name
      const timestamp = Date.now();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Authenticator-${timestamp}`,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      setFactorId(data.id);
      setSecret(data.totp.secret);
      const otpauthUrl = data.totp.uri;
      
      // Generate QR code
      const qrUrl = await QRCode.toDataURL(otpauthUrl);
      setQrCodeUrl(qrUrl);
      setStep("verify");
    },
    onError: (error: any) => {
      toast({
        title: "Enrollment failed",
        description: error.message || "Failed to enroll in 2FA",
        variant: "destructive",
      });
    },
  });

  // Verify and enable MFA
  const verifyMfaMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!factorId) throw new Error("No factor ID found");

      // Challenge and verify
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factorId,
      });

      if (challengeError) throw challengeError;

      const { data, error } = await supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: challengeData.id,
        code: code,
      });

      if (error) throw error;

      // Save MFA status to database
      await supabase.from("user_mfa_settings").upsert({
        user_id: user?.id,
        is_enabled: true,
        enabled_at: new Date().toISOString(),
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mfa-settings"] });
      toast({
        title: "2FA enabled",
        description: "Two-factor authentication has been enabled successfully.",
      });
      setStep("info");
      setVerificationCode("");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    },
  });

  // Disable MFA
  const disableMfaMutation = useMutation({
    mutationFn: async () => {
      // Unenroll from all factors
      const { data: factors } = await supabase.auth.mfa.listFactors();
      
      if (factors?.totp && factors.totp.length > 0) {
        for (const factor of factors.totp) {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }

      // Update database
      await supabase
        .from("user_mfa_settings")
        .update({ is_enabled: false, enabled_at: null })
        .eq("user_id", user?.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mfa-settings"] });
      toast({
        title: "2FA disabled",
        description: "Two-factor authentication has been disabled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disable 2FA",
        variant: "destructive",
      });
    },
  });

  const handleEnroll = () => {
    setStep("setup");
    enrollMfaMutation.mutate();
  };

  const handleVerify = () => {
    if (verificationCode.length === 6) {
      verifyMfaMutation.mutate(verificationCode);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    toast({
      title: "Copied",
      description: "Secret key copied to clipboard",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>2-Step Verification</DialogTitle>
          <DialogDescription>
            Add an extra layer of security to your account
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="py-4">
            {step === "info" && (
              <>
                {mfaSettings?.is_enabled ? (
                  <Alert className="mb-6">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>2FA is enabled</AlertTitle>
                    <AlertDescription>
                      Your account is protected with two-factor authentication.
                      {mfaSettings.enabled_at && (
                        <span className="block mt-1 text-xs">
                          Enabled on {new Date(mfaSettings.enabled_at).toLocaleDateString()}
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="mb-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>2FA is not enabled</AlertTitle>
                    <AlertDescription>
                      Protect your account by enabling two-factor authentication.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">What is 2-Step Verification?</h4>
                    <p className="text-sm text-muted-foreground">
                      2-Step Verification adds an extra layer of security to your account.
                      When enabled, you'll need to provide both your password and a
                      verification code from your authenticator app to sign in.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Features:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Authenticator app support (Google Authenticator, Authy, etc.)</li>
                      <li>Time-based one-time passwords (TOTP)</li>
                      <li>Enhanced account security</li>
                    </ul>
                  </div>
                </div>

                <DialogFooter className="mt-6">
                  {mfaSettings?.is_enabled ? (
                    <Button
                      variant="destructive"
                      onClick={() => disableMfaMutation.mutate()}
                      disabled={disableMfaMutation.isPending}
                    >
                      {disableMfaMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Disable 2FA
                    </Button>
                  ) : (
                    <Button onClick={handleEnroll} disabled={enrollMfaMutation.isPending}>
                      {enrollMfaMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Enable 2FA
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}

            {step === "setup" && enrollMfaMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Setting up 2FA...</p>
              </div>
            )}

            {step === "verify" && qrCodeUrl && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-4">Step 1: Scan QR Code</h4>
                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Scan this QR code with your authenticator app
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Or enter this key manually:</h4>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                      {secret}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopySecret}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">Step 2: Enter Verification Code</h4>
                  <div className="space-y-2">
                    <Label htmlFor="verificationCode">6-digit code from your app</Label>
                    <Input
                      id="verificationCode"
                      type="text"
                      placeholder="000000"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep("info");
                      setVerificationCode("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleVerify}
                    disabled={verificationCode.length !== 6 || verifyMfaMutation.isPending}
                  >
                    {verifyMfaMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Verify & Enable
                  </Button>
                </DialogFooter>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
