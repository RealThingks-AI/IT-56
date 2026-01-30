import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProfileCard } from "@/components/Profile/ProfileCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Lock, Key, Smartphone, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ChangePasswordDialog } from "@/components/Profile/ChangePasswordDialog";
import { TwoFactorDialog } from "@/components/Profile/TwoFactorDialog";
import { RecoveryOptionsDialog } from "@/components/Profile/RecoveryOptionsDialog";
import { ManageDevicesDialog } from "@/components/Profile/ManageDevicesDialog";
const Security = () => {
  const {
    user
  } = useAuth();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isTwoFactorDialogOpen, setIsTwoFactorDialogOpen] = useState(false);
  const [isRecoveryDialogOpen, setIsRecoveryDialogOpen] = useState(false);
  const [isDevicesDialogOpen, setIsDevicesDialogOpen] = useState(false);

  // Fetch MFA status
  const {
    data: mfaSettings
  } = useQuery({
    queryKey: ["mfa-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const {
        data,
        error
      } = await supabase.from("user_mfa_settings").select("*").eq("user_id", user.id).maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user?.id
  });
  return <div className="py-4 space-y-4">
          <div>
            <h1 className="text-2xl font-normal">Security</h1>
            
          </div>

          <div className="grid gap-4">
            <ProfileCard title="Password" description="A strong password helps prevent unauthorized access" icon={<div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <Lock className="h-6 w-6 text-blue-600" />
                </div>} actionLabel="Change password" onAction={() => setIsPasswordDialogOpen(true)}>
              <p className="text-sm text-muted-foreground">
                Last changed: Never
              </p>
            </ProfileCard>

            <ProfileCard title="2-Step Verification" description="Add an extra layer of security to your account" icon={<div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>} actionLabel={mfaSettings?.is_enabled ? "Manage 2FA" : "Set up 2-Step Verification"} onAction={() => setIsTwoFactorDialogOpen(true)}>
              {mfaSettings?.is_enabled ? <p className="text-sm text-green-600 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Enabled
                </p> : <p className="text-sm text-orange-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Not enabled
                </p>}
            </ProfileCard>

            <ProfileCard title="Recovery options" description="Add recovery options to regain access if you're locked out" icon={<div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center">
                  <Key className="h-6 w-6 text-purple-600" />
                </div>} actionLabel="Manage recovery options" onAction={() => setIsRecoveryDialogOpen(true)} />

            <ProfileCard title="Your devices" description="Manage the devices you're signed in to" icon={<div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-orange-600" />
                </div>} actionLabel="Manage devices" onAction={() => setIsDevicesDialogOpen(true)} />
          </div>

      {/* Dialogs */}
      <ChangePasswordDialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen} />
      <TwoFactorDialog open={isTwoFactorDialogOpen} onOpenChange={setIsTwoFactorDialogOpen} />
      <RecoveryOptionsDialog open={isRecoveryDialogOpen} onOpenChange={setIsRecoveryDialogOpen} />
      <ManageDevicesDialog open={isDevicesDialogOpen} onOpenChange={setIsDevicesDialogOpen} />
    </div>;
};

export default Security;