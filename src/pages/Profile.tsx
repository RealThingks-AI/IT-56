import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ProfileCard } from "@/components/Profile/ProfileCard";
import { Loader2, Settings, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import PersonalInfo from "./profile/PersonalInfo";
import Security from "./profile/Security";

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [activeSection, setActiveSection] = useState("home");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const mainRef = useRef<HTMLElement>(null);

  // Intersection Observer for tracking active section
  useEffect(() => {
    if (!mainRef.current) return;

    const observerOptions = {
      root: mainRef.current,
      rootMargin: "-20% 0px -60% 0px",
      threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      const visibleSections = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visibleSections.length > 0) {
        setActiveSection(visibleSections[0].target.id);
      }
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    const sections = ["home", "personal-info", "security"];
    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  // Handle hash navigation on load
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, [location.hash]);

  const { data: userData, isLoading } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("auth_user_id", user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Keep local form state in sync with latest server data
  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        phone: userData.phone || "",
      });
    } else if (user) {
      setFormData({
        name: (user.user_metadata as any)?.name || user.email || "",
        email: user.email || "",
        phone: (user.user_metadata as any)?.phone || "",
      });
    }
  }, [userData, user]);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Simple header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Profile</h1>
        </div>
      </div>

      {/* Main Content with smooth scrolling */}
      <main ref={mainRef} className="overflow-y-auto scroll-smooth">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
          {/* Home Section */}
          <section id="home" className="py-4 space-y-4">
            {/* Header Section */}
            <div className="text-center space-y-3">
              <Avatar className="h-20 w-20 mx-auto border-4 border-primary/20">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-3xl font-bold">
                  {getInitials(userData?.name || formData.name)}
                </AvatarFallback>
              </Avatar>

              <div>
                <h1 className="text-2xl font-normal text-foreground">
                  Welcome, {formData.name || "User"}
                </h1>
              </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Profile & Personalization Card */}
              <ProfileCard
                title="Profile & personalization"
                description="See your profile data and manage your account information"
                icon={
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                    <Settings className="h-8 w-8 text-white" />
                  </div>
                }
                actionLabel="Manage your profile info"
                onAction={() => {
                  const element = document.getElementById("personal-info");
                  element?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              />

              {/* Security Tips Card */}
              <ProfileCard
                title="You have security recommendations"
                description="Security issues found in your Security Checkup"
                icon={
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  </div>
                }
                actionLabel="Review security tips"
                onAction={() => {
                  const element = document.getElementById("security");
                  element?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              />

              {/* Account Information Card */}
              <ProfileCard
                title="Account information"
                description="View and manage your account details and preferences"
                icon={
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-white" />
                  </div>
                }
              >
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{formData.email || user?.email}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Role</span>
                    <span className="font-medium capitalize">{userData?.role || "Member"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium text-green-600">{userData?.status || "Active"}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Member Since</span>
                    <span className="font-medium">
                      {userData?.created_at ? format(new Date(userData.created_at), "MMM dd, yyyy") : "-"}
                    </span>
                  </div>
                </div>
              </ProfileCard>
            </div>
          </section>

          {/* Personal Info Section */}
          <section id="personal-info" className="py-4">
            <PersonalInfo />
          </section>

          {/* Security Section */}
          <section id="security" className="py-4">
            <Security />
          </section>
        </div>
      </main>
    </div>
  );
};

export default Profile;
