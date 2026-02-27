import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, ShieldCheck, Loader2 } from "lucide-react";
import appLogo from "@/assets/app-logo.png";

const PasswordReset = () => {
  // Pre-fill from remembered email
  const [email, setEmail] = useState(() => localStorage.getItem("rememberedEmail") ?? "");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("notify-admin-password-reset", {
        body: { userEmail: trimmedEmail, userName: name.trim() || undefined },
      });

      if (error) throw new Error(error.message || "Failed to send request");
      if (!data?.success) throw new Error(data?.error || "Failed to send request");

      setSent(true);
      toast({ title: "Request Sent", description: "Your password reset request has been sent to the administrator." });
    } catch (error: any) {
      console.error("Password reset request error:", error);
      toast({ title: "Error", description: error.message || "Failed to send request. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="p-8">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-4">
              <img src={appLogo} alt="RT-IT-Hub" className="w-14 h-14 object-contain" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Request Password Reset</h1>
            <p className="text-sm text-muted-foreground">
              Enter your details and an administrator will reset your credentials
            </p>
          </div>

          {sent ? (
            <div className="space-y-5 animate-fade-in">
              <div className="p-5 bg-accent/20 rounded-lg text-center space-y-3">
                <ShieldCheck className="h-12 w-12 mx-auto text-primary" />
                <p className="text-sm font-semibold">Request Sent to Administrator</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your password reset request has been sent to the IT administrators.
                  They will reset your credentials and contact you shortly.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setSent(false); setEmail(""); setName(""); }}
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
            <form onSubmit={handleRequestReset} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
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
                {email.length > 0 && !isValidEmail(email) && (
                  <p className="text-xs text-destructive">Please enter a valid email address</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  Your Name <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  autoComplete="name"
                />
                <p className="text-xs text-muted-foreground">Helps the administrator identify your account</p>
              </div>

              <Button type="submit" className="w-full h-10" disabled={loading || (email.length > 0 && !isValidEmail(email))}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Request…
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
  );
};

export default PasswordReset;
