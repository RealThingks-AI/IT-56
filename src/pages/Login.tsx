import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { AUTH_CONFIG } from "@/config/auth";
import { useSessionStore } from "@/stores/useSessionStore";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import appLogo from "@/assets/app-logo.png";

const Login = () => {
  const queryClient = useQueryClient();
  const bootstrap = useSessionStore((s) => s.bootstrap);

  const [isSignup, setIsSignup] = useState(false);
  // Lazy initializer — reads localStorage synchronously on first render, no race condition
  const [email, setEmail] = useState(() => localStorage.getItem("rememberedEmail") ?? "");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem("rememberedEmail"));
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in — use auth context event instead of redundant getSession
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate("/");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          toast({
            title: "Email Not Confirmed",
            description: "Please check your email and click the confirmation link to activate your account.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      // Persist or clear remembered email only on successful login
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      // Reset stale state then bootstrap fresh
      useSessionStore.getState().clear();
      await bootstrap();

      // Navigate immediately, prefetch in background
      navigate("/");

      // Fire-and-forget prefetch
      queryClient.prefetchQuery({
        queryKey: ["helpdesk-dashboard-stats"],
        queryFn: async () => {
          const { data: tickets } = await supabase
            .from("helpdesk_tickets")
            .select("id, status, priority, sla_breached, created_at, resolved_at, first_response_at")
            .eq("is_deleted", false);
          return tickets;
        },
        staleTime: 5 * 60 * 1000,
      });
      queryClient.prefetchQuery({
        queryKey: ["itam-stats"],
        queryFn: async () => {
          const { data } = await supabase.rpc("get_itam_stats");
          return {
            totalAssets: (data as any)?.totalAssets || 0,
            assigned: (data as any)?.assigned || 0,
            licenses: (data as any)?.licenses || 0,
            laptops: 0,
          };
        },
        staleTime: 5 * 60 * 1000,
      });

      toast({ title: "Success", description: "Logged in successfully!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const redirectUrl = AUTH_CONFIG.getSignupRedirectUrl();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl, data: { name } },
      });
      if (error) throw error;
      toast({ title: "Account created", description: "Please check your email to confirm your account, then sign in." });
      setIsSignup(false);
      setPassword("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-card rounded-xl border border-border shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <img src={appLogo} alt="RT-IT-Hub" className="w-14 h-14 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {isSignup ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isSignup ? "Get started with RT-IT-Hub" : "Sign in to RT-IT-Hub"}
            </p>
          </div>

          {!isSignup ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@company.com"
                  autoFocus
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <label htmlFor="remember" className="text-foreground cursor-pointer select-none">
                    Remember my email
                  </label>
                </div>
                <Link to="/password-reset" className="text-primary hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Enter your full name" autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@company.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Minimum 6 characters"
                    minLength={6}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          )}

          {/* Toggle between Login/Signup */}
          <div className="mt-6 text-center text-sm">
            {isSignup ? (
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setIsSignup(false); setPassword(""); }}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
};

export default Login;
