import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Eye, EyeOff, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPasswordChanged?: () => void;
}

interface PasswordRequirement {
  label: string;
  met: boolean;
}

const checkPasswordStrength = (password: string): { 
  score: number; 
  requirements: PasswordRequirement[];
  label: string;
  color: string;
} => {
  const requirements: PasswordRequirement[] = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
    { label: "Contains a number", met: /\d/.test(password) },
    { label: "Contains special character", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const metCount = requirements.filter(r => r.met).length;
  const score = (metCount / requirements.length) * 100;

  let label = "Very Weak";
  let color = "bg-destructive";
  
  if (score >= 100) {
    label = "Strong";
    color = "bg-green-500";
  } else if (score >= 80) {
    label = "Good";
    color = "bg-blue-500";
  } else if (score >= 60) {
    label = "Fair";
    color = "bg-yellow-500";
  } else if (score >= 40) {
    label = "Weak";
    color = "bg-orange-500";
  }

  return { score, requirements, label, color };
};

export const ChangePasswordDialog = ({
  open,
  onOpenChange,
  onPasswordChanged,
}: ChangePasswordDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null);

  const passwordStrength = useMemo(
    () => checkPasswordStrength(passwords.newPassword),
    [passwords.newPassword]
  );

  const passwordsMatch = passwords.newPassword === passwords.confirmPassword && passwords.confirmPassword !== "";
  const isPasswordValid = passwordStrength.score >= 80;
  const canSubmit = isPasswordValid && passwordsMatch && passwords.currentPassword.length > 0;

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      setCurrentPasswordError(null);

      if (passwords.newPassword !== passwords.confirmPassword) {
        throw new Error("New passwords do not match");
      }

      if (!isPasswordValid) {
        throw new Error("Password does not meet security requirements");
      }

      // First, verify the current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error("Unable to verify current session");
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwords.currentPassword,
      });

      if (signInError) {
        setCurrentPasswordError("Current password is incorrect");
        throw new Error("Current password is incorrect");
      }

      // Now update to the new password
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      // Update last_password_change in user_preferences
      try {
        const { data: userProfile } = await supabase
          .from("users")
          .select("id")
          .eq("auth_user_id", user?.id)
          .single();
        
        if (userProfile) {
          await supabase
            .from("user_preferences")
            .upsert(
              { user_id: userProfile.id, last_password_change: new Date().toISOString() },
              { onConflict: "user_id" }
            );
        }
      } catch (error) {
        console.error("Failed to update password change timestamp:", error);
      }

      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      onPasswordChanged?.();
      onOpenChange(false);
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setCurrentPasswordError(null);
    },
    onError: (error: Error) => {
      if (error.message !== "Current password is incorrect") {
        toast({
          title: "Error",
          description: error.message || "Failed to change password",
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    changePasswordMutation.mutate();
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setCurrentPasswordError(null);
      setShowPasswords({ current: false, new: false, confirm: false });
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new secure password.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? "text" : "password"}
                  value={passwords.currentPassword}
                  onChange={(e) => {
                    setPasswords({ ...passwords, currentPassword: e.target.value });
                    setCurrentPasswordError(null);
                  }}
                  required
                  className={cn(currentPasswordError && "border-destructive")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {currentPasswordError && (
                <p className="text-sm text-destructive">{currentPasswordError}</p>
              )}
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? "text" : "password"}
                  value={passwords.newPassword}
                  onChange={(e) =>
                    setPasswords({ ...passwords, newPassword: e.target.value })
                  }
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                >
                  {showPasswords.new ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>

              {/* Password Strength Indicator */}
              {passwords.newPassword && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Progress value={passwordStrength.score} className="h-2 flex-1" />
                    <span className={cn(
                      "text-xs font-medium",
                      passwordStrength.score >= 80 ? "text-green-600" : 
                      passwordStrength.score >= 60 ? "text-yellow-600" : "text-destructive"
                    )}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {passwordStrength.requirements.map((req, index) => (
                      <li key={index} className="flex items-center gap-2 text-xs">
                        {req.met ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <X className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className={cn(
                          req.met ? "text-green-600" : "text-muted-foreground"
                        )}>
                          {req.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwords.confirmPassword}
                  onChange={(e) =>
                    setPasswords({ ...passwords, confirmPassword: e.target.value })
                  }
                  required
                  className={cn(
                    passwords.confirmPassword && !passwordsMatch && "border-destructive"
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {passwords.confirmPassword && !passwordsMatch && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
              {passwords.confirmPassword && passwordsMatch && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Passwords match
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={changePasswordMutation.isPending || !canSubmit}
            >
              {changePasswordMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Change Password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
