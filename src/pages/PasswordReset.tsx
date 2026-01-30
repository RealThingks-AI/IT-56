import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BackButton } from "@/components/BackButton";
import { Mail, ArrowLeft, ShieldCheck } from "lucide-react";
import appLogo from "@/assets/app-logo.png";

const PasswordReset = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      console.log('Sending password reset request to admin...');
      
      const { data, error } = await supabase.functions.invoke('notify-admin-password-reset', {
        body: { 
          userEmail: trimmedEmail,
          userName: name.trim() || undefined
        }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to send request");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to send request");
      }

      setSent(true);
      toast({
        title: "Request Sent",
        description: "Your password reset request has been sent to the administrator.",
      });
    } catch (error: any) {
      console.error("Password reset request error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <BackButton />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
        <div className="w-full max-w-md animate-fade-in">
          <Card className="p-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-3">
                <img src={appLogo} alt="RT-IT-Hub" className="w-12 h-12" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Request Password Reset</h1>
              <p className="text-sm text-muted-foreground">
                Enter your details and an administrator will reset your credentials
              </p>
            </div>

            {sent ? (
              <div className="space-y-4">
                <div className="p-4 bg-accent/20 rounded-md text-center space-y-2">
                  <ShieldCheck className="h-10 w-10 mx-auto text-primary" />
                  <p className="text-sm font-medium">Request Sent to Administrator</p>
                  <p className="text-sm text-muted-foreground">
                    Your password reset request has been sent to the IT administrators.
                    <br />
                    They will reset your credentials and contact you shortly.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSent(false);
                    setEmail("");
                    setName("");
                  }}
                >
                  Submit another request
                </Button>
                <Link to="/login">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@company.com"
                    autoFocus
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Your Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    autoComplete="name"
                  />
                  <p className="text-xs text-muted-foreground">
                    Helps the administrator identify your account
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Mail className="mr-2 h-4 w-4 animate-pulse" />
                      Sending Request...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Request Password Reset
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                    <ArrowLeft className="h-3 w-3" />
                    Back to Login
                  </Link>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>
    </>
  );
};

export default PasswordReset;
