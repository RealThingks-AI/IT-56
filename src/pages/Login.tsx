import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { AUTH_CONFIG } from "@/config/auth";
import appLogo from "@/assets/app-logo.png";

const Login = () => {
  const queryClient = useQueryClient();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();

  // Check if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  // Load saved email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }
      const {
        error
      } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        if (error.message.includes("Email not confirmed")) {
          toast({
            title: "Email Not Confirmed",
            description: "Please check your email and click the confirmation link to activate your account.",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      // Clear stale permission cache to prevent false denials
      localStorage.removeItem('page-permissions-cache');
      localStorage.removeItem('organisation-cache');

      // Prefetch critical data after successful login for faster initial load
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        // Prefetch all critical data in parallel
        const parentRoutes = ['/', '/tickets', '/assets', '/subscription', '/system-updates', '/monitoring', '/reports', '/audit', '/settings'];
        
        await Promise.all([
          // Prefetch user role
          queryClient.prefetchQuery({
            queryKey: ["user-role", authUser.id],
            queryFn: async () => {
              const { data } = await supabase.rpc("get_user_role", { _user_id: authUser.id });
              return data;
            },
          }),
          
          // Prefetch organisation data
          queryClient.prefetchQuery({
            queryKey: ["organisation", authUser.id],
            queryFn: async () => {
              const { data } = await supabase
                .from('users')
                .select(`
                  organisation_id,
                  organisations:organisation_id (id, name, logo_url, active_tools, plan, domain)
                `)
                .eq('auth_user_id', authUser.id)
                .maybeSingle();
              return data?.organisations;
            },
          }),

          // Prefetch page permissions for sidebar
          queryClient.prefetchQuery({
            queryKey: ["page-access-multiple", parentRoutes.join(","), authUser.id],
            queryFn: async () => {
              const { data } = await supabase.rpc("check_multiple_routes_access", { 
                _routes: parentRoutes 
              });
              // Also cache to localStorage for instant sidebar render
              if (Array.isArray(data)) {
                const accessMap: Record<string, boolean> = {};
                data.forEach((item: { route: string; has_access: boolean }) => {
                  accessMap[item.route] = item.has_access;
                });
                try {
                  localStorage.setItem('page-permissions-cache', JSON.stringify({
                    userId: authUser.id,
                    permissions: accessMap,
                    timestamp: Date.now(),
                  }));
                } catch { /* ignore */ }
                return accessMap;
              }
              return {};
            },
          }),
        ]);
      }

      toast({
        title: "Success",
        description: "Logged in successfully!"
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const redirectUrl = AUTH_CONFIG.getSignupRedirectUrl();
      console.log('Signup redirect URL:', redirectUrl);
      const {
        error
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name
          }
        }
      });
      if (error) throw error;
      toast({
        title: "Account created",
        description: "Please check your email to confirm your account, then sign in."
      });
      setIsSignup(false);
      setPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-card rounded-lg border border-border shadow-lg p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-3">
              <img src={appLogo} alt="RT-IT-Hub" className="w-12 h-12" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {isSignup ? "Create your RT-IT-Hub account" : "Sign in to RT-IT-Hub"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              IT Helpdesk Management
            </p>
          </div>

          {!isSignup ? (/* Login Form */
        <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@company.com" autoFocus autoComplete="email" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter your password" autoComplete="current-password" />
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Checkbox id="remember" checked={rememberMe} onCheckedChange={checked => setRememberMe(checked as boolean)} />
                  <label htmlFor="remember" className="text-foreground cursor-pointer">
                    Remember my email
                  </label>
                </div>
                <Link to="/password-reset" className="text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : <>
                    
                    Sign in
                  </>}
              </Button>
            </form>) : (/* Signup Form */
        <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Enter your full name" autoFocus />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@company.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Minimum 6 characters" minLength={6} />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>)}

          {/* Toggle between Login/Signup */}
          <div className="mt-6 text-center text-sm">
            {isSignup ? <p className="text-muted-foreground">
                Already have an account?{" "}
                <button type="button" onClick={() => {
              setIsSignup(false);
              setPassword("");
            }} className="text-primary hover:underline font-medium">
                  Sign in
                </button>
              </p> : null}
          </div>
        </div>
      </div>
    </div>;
};
export default Login;