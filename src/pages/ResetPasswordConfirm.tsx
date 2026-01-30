import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BackButton } from "@/components/BackButton";
import { Eye, EyeOff, Check, X, Loader2 } from "lucide-react";

const ResetPasswordConfirm = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isValidSession, setIsValidSession] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const passwordRequirements = [
    { label: "At least 6 characters", met: password.length >= 6 },
    { label: "Passwords match", met: password.length > 0 && password === confirmPassword },
  ];

  useEffect(() => {
    // Check for hash fragment with recovery token
    const hash = window.location.hash;
    console.log("URL hash:", hash);
    
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      const errorDescription = hashParams.get('error_description');
      
      console.log("Hash params - type:", type, "hasToken:", !!accessToken, "error:", errorDescription);
      
      if (errorDescription) {
        console.error("Auth error from URL:", errorDescription);
        setCheckingSession(false);
        return;
      }
      
      if (type === 'recovery' && accessToken) {
        console.log("Recovery token detected, Supabase will handle session exchange...");
      }
    }
    
    // Listen for auth state changes - this catches the recovery token exchange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event, "Session:", !!session);
      
      if (event === "PASSWORD_RECOVERY") {
        console.log("PASSWORD_RECOVERY event received - session valid");
        setIsValidSession(true);
        setCheckingSession(false);
      } else if (event === "SIGNED_IN" && session) {
        console.log("SIGNED_IN event received - session valid");
        setIsValidSession(true);
        setCheckingSession(false);
      }
    });

    // Also check for existing session (in case page was refreshed or token already exchanged)
    const checkSession = async () => {
      // Give more time for the hash fragment to be processed by Supabase
      // Increased timeout for slower connections
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log("Session check - hasSession:", !!session, "error:", error?.message);
      
      if (session) {
        setIsValidSession(true);
      }
      setCheckingSession(false);
    };
    
    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      // Sign out after password change for security
      await supabase.auth.signOut();

      toast({
        title: "Password Updated",
        description: "Your password has been updated. Please sign in with your new password.",
      });

      navigate("/login");
    } catch (error: any) {
      console.error("Password update error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Verifying your reset link...</p>
        </Card>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
        <Card className="w-full max-w-md p-6 text-center space-y-4">
          <X className="h-12 w-12 mx-auto text-destructive" />
          <h1 className="text-xl font-bold">Invalid or Expired Link</h1>
          <p className="text-sm text-muted-foreground">
            This password reset link is invalid or has expired.
            Please request a new one.
          </p>
          <Button onClick={() => navigate("/password-reset")} className="w-full">
            Request New Reset Link
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <BackButton />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
        <div className="w-full max-w-md animate-fade-in">
          <Card className="p-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-3">
                <span className="text-2xl font-bold text-primary">RT-IT-Hub</span>
              </div>
              <h1 className="text-2xl font-bold mb-2">Set New Password</h1>
              <p className="text-sm text-muted-foreground">
                Enter your new password below
              </p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter new password"
                    minLength={6}
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm new password"
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Password requirements */}
              <div className="space-y-1">
                {passwordRequirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    {req.met ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <X className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={req.met ? "text-green-600" : "text-muted-foreground"}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !passwordRequirements.every(r => r.met)}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
};

export default ResetPasswordConfirm;
