import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface RecoveryOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RecoveryOptionsDialog = ({
  open,
  onOpenChange,
}: RecoveryOptionsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryPhone, setRecoveryPhone] = useState("");

  // Fetch recovery options
  const { data: recoveryOptions, isLoading } = useQuery({
    queryKey: ["recovery-options", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("user_recovery_options")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  // Update recovery email
  const updateEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Invalid email format");
      }

      const { data, error } = await supabase
        .from("user_recovery_options")
        .upsert({
          user_id: user.id,
          recovery_email: email,
          recovery_email_verified: false,
        }, {
          onConflict: "user_id"
        })
        .select()
        .single();

      if (error) throw error;

      // Send verification email
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        "send-recovery-verification",
        {
          body: {
            userId: user.id,
            type: "email",
            value: email,
          },
        }
      );

      if (verifyError) {
        console.error("Verification email error:", verifyError);
      }

      return { data, verifyData };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["recovery-options"] });
      
      if (result.verifyData?.code) {
        // In development, show the code in the toast
        toast({
          title: "Recovery email added",
          description: `Verification system not fully configured. Dev code: ${result.verifyData.code}`,
        });
      } else {
        toast({
          title: "Recovery email added",
          description: "Please check your email for verification instructions.",
        });
      }
      setRecoveryEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update recovery email",
        variant: "destructive",
      });
    },
  });

  // Update recovery phone
  const updatePhoneMutation = useMutation({
    mutationFn: async (phone: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const cleanPhone = phone.replace(/[\s()-]/g, '');
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(cleanPhone)) {
        throw new Error("Invalid phone number format. Use international format");
      }

      const { data, error } = await supabase
        .from("user_recovery_options")
        .upsert({
          user_id: user.id,
          recovery_phone: cleanPhone,
          recovery_phone_verified: false,
        }, {
          onConflict: "user_id"
        })
        .select()
        .single();

      if (error) throw error;

      // Send verification SMS
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        "send-recovery-verification",
        {
          body: {
            userId: user.id,
            type: "phone",
            value: cleanPhone,
          },
        }
      );

      if (verifyError) {
        console.error("Verification SMS error:", verifyError);
      }

      return { data, verifyData };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["recovery-options"] });
      
      if (result.verifyData?.code) {
        // In development, show the code in the toast
        toast({
          title: "Recovery phone added",
          description: `SMS system not fully configured. Dev code: ${result.verifyData.code}`,
        });
      } else {
        toast({
          title: "Recovery phone added",
          description: "A verification code has been sent to your phone.",
        });
      }
      setRecoveryPhone("");
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update recovery phone",
        variant: "destructive",
      });
    },
  });

  const handleAddEmail = () => {
    if (recoveryEmail.trim()) {
      updateEmailMutation.mutate(recoveryEmail);
    }
  };

  const handleAddPhone = () => {
    if (recoveryPhone.trim()) {
      updatePhoneMutation.mutate(recoveryPhone);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Recovery Options</DialogTitle>
          <DialogDescription>
            Add recovery options to regain access if you're locked out
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label>Current Email</Label>
              </div>
              <div className="flex items-center gap-2">
                <Input value={user?.email || ""} disabled />
                <Badge variant="secondary">Primary</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="recovery-email">Recovery Email</Label>
              </div>
              {recoveryOptions?.recovery_email ? (
                <div className="flex items-center gap-2">
                  <Input value={recoveryOptions.recovery_email} disabled />
                  <Badge variant={recoveryOptions.recovery_email_verified ? "default" : "secondary"}>
                    {recoveryOptions.recovery_email_verified ? "Verified" : "Unverified"}
                  </Badge>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="recovery-email"
                      type="email"
                      placeholder="recovery@example.com"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                    />
                    <Button 
                      onClick={handleAddEmail}
                      disabled={!recoveryEmail.trim() || updateEmailMutation.isPending}
                    >
                      {updateEmailMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Add
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This email can be used to recover your account
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="recovery-phone">Recovery Phone Number</Label>
              </div>
              {recoveryOptions?.recovery_phone ? (
                <div className="flex items-center gap-2">
                  <Input value={recoveryOptions.recovery_phone} disabled />
                  <Badge variant={recoveryOptions.recovery_phone_verified ? "default" : "secondary"}>
                    {recoveryOptions.recovery_phone_verified ? "Verified" : "Unverified"}
                  </Badge>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="recovery-phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={recoveryPhone}
                      onChange={(e) => setRecoveryPhone(e.target.value)}
                    />
                    <Button 
                      onClick={handleAddPhone}
                      disabled={!recoveryPhone.trim() || updatePhoneMutation.isPending}
                    >
                      {updatePhoneMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Add
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get verification codes via SMS
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
