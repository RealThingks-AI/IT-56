import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  User, Settings, Loader2, Key, Shield, Bell, Monitor, Mail, LogOut,
  AlertCircle, AlertTriangle, Trash2
} from "lucide-react";
import { ChangePasswordDialog } from "@/components/Profile/ChangePasswordDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AvatarUpload } from "@/components/Profile/AvatarUpload";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { profileFormSchema } from "@/lib/validationSchemas";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { HeaderUserSection } from "@/components/HeaderUserSection";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string | null;
  avatar_url: string | null;
}
interface FormErrors {
  name?: string;
  phone?: string;
}

const sidebarNavItems = [
  { id: "profile", label: "Profile", icon: User },
  { id: "display", label: "Display", icon: Settings },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
];

const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "INR", label: "INR (₹)" },
  { value: "JPY", label: "JPY (¥)" },
  { value: "AUD", label: "AUD (A$)" },
  { value: "CAD", label: "CAD (C$)" },
  { value: "CHF", label: "CHF (Fr)" },
  { value: "SGD", label: "SGD (S$)" },
  { value: "AED", label: "AED (د.إ)" },
  { value: "BRL", label: "BRL (R$)" },
  { value: "SEK", label: "SEK (kr)" },
  { value: "CNY", label: "CNY (¥)" },
];

const TIMEZONES = [
  { value: "UTC", label: "(GMT+0:00) UTC" },
  { value: "America/New_York", label: "(GMT-5:00) Eastern Time" },
  { value: "America/Chicago", label: "(GMT-6:00) Central Time" },
  { value: "America/Denver", label: "(GMT-7:00) Mountain Time" },
  { value: "America/Los_Angeles", label: "(GMT-8:00) Pacific Time" },
  { value: "America/Sao_Paulo", label: "(GMT-3:00) São Paulo" },
  { value: "America/Toronto", label: "(GMT-5:00) Toronto" },
  { value: "Europe/London", label: "(GMT+0:00) London" },
  { value: "Europe/Paris", label: "(GMT+1:00) Paris" },
  { value: "Europe/Berlin", label: "(GMT+1:00) Berlin" },
  { value: "Europe/Stockholm", label: "(GMT+1:00) Stockholm" },
  { value: "Europe/Zurich", label: "(GMT+1:00) Zurich" },
  { value: "Asia/Dubai", label: "(GMT+4:00) Dubai" },
  { value: "Asia/Kolkata", label: "(GMT+5:30) India" },
  { value: "Asia/Singapore", label: "(GMT+8:00) Singapore" },
  { value: "Asia/Shanghai", label: "(GMT+8:00) Shanghai" },
  { value: "Asia/Tokyo", label: "(GMT+9:00) Tokyo" },
  { value: "Australia/Sydney", label: "(GMT+11:00) Sydney" },
  { value: "Pacific/Auckland", label: "(GMT+12:00) Auckland" },
];

export default function AccountSettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { preferences, updatePreferences, isLoading: prefsLoading } = useUserPreferences();
  const [activeSection, setActiveSection] = useState("profile");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [sessionInfo, setSessionInfo] = useState<{ createdAt: Date | null }>({ createdAt: null });

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null;
        const createdAt = expiresAt ? new Date(expiresAt.getTime() - 3600 * 1000) : new Date();
        setSessionInfo({ createdAt });
      }
    };
    fetchSession();
  }, []);

  const { data: userProfile, isLoading } = useQuery({
    queryKey: ["user-profile-account", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, phone, role, avatar_url")
        .eq("auth_user_id", user.id)
        .single();
      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user?.id,
  });

  const initialFormData = useMemo(() => ({
    name: userProfile?.name || "",
    phone: userProfile?.phone || "",
  }), [userProfile]);

  useEffect(() => {
    if (userProfile) {
      setFormData({ name: userProfile.name || "", phone: userProfile.phone || "" });
    }
  }, [userProfile]);

  const hasUnsavedChanges = formData.name !== initialFormData.name || formData.phone !== initialFormData.phone;

  const validateForm = (): boolean => {
    const result = profileFormSchema.safeParse(formData);
    if (!result.success) {
      const errors: FormErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof FormErrors;
        errors[field] = err.message;
      });
      setFormErrors(errors);
      return false;
    }
    setFormErrors({});
    return true;
  };

  const updateProfile = useMutation({
    mutationFn: async (data: { name: string; phone: string }) => {
      if (!userProfile?.id) throw new Error("User not found");
      const { error } = await supabase
        .from("users")
        .update({ name: data.name, phone: data.phone || null })
        .eq("id", userProfile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile-account"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-user-profile"] });
      toast.success("Profile updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update profile: " + error.message);
    },
  });

  const handleSaveProfile = () => {
    if (validateForm()) {
      updateProfile.mutate(formData);
    }
  };

  const handleAvatarChange = (url: string) => {
    queryClient.invalidateQueries({ queryKey: ["user-profile-account"] });
    queryClient.invalidateQueries({ queryKey: ["sidebar-user-profile"] });
  };

  const handleAvatarRemove = () => {
    queryClient.invalidateQueries({ queryKey: ["user-profile-account"] });
    queryClient.invalidateQueries({ queryKey: ["sidebar-user-profile"] });
  };

  const handleDisplayPrefChange = (key: string, value: string) => {
    updatePreferences.mutate({ [key]: value });
    toast.success("Display preference saved");
  };

  const handleNotificationPrefChange = (updates: Partial<typeof preferences.notification_settings>) => {
    const newSettings = { ...preferences.notification_settings, ...updates };
    updatePreferences.mutate({ notification_settings: newSettings });
  };

  const formatLastPasswordChange = () => {
    if (!preferences.last_password_change) return "Never changed";
    const date = new Date(preferences.last_password_change);
    return `Changed ${formatDistanceToNow(date, { addSuffix: true })}`;
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const notificationSettings = preferences.notification_settings || {
    deliveryFrequency: "instant",
    emailEnabled: true,
    inAppEnabled: true,
    moduleNotifications: { tickets: true, assets: true, systemUpdates: true, subscriptions: true, monitoring: true },
  };

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case "admin":
      case "owner":
        return "destructive" as const;
      case "manager":
        return "default" as const;
      default:
        return "secondary" as const;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background sticky top-0 z-10">
          <div className="px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-8 w-40" />
          </div>
        </div>
        <div className="flex">
          <div className="w-56 border-r p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
          <div className="flex-1 p-6 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">My Account</h1>
          </div>
          <HeaderUserSection />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation - hidden on mobile */}
        <aside className="hidden md:flex w-56 min-w-[14rem] border-r bg-background flex-col">
          <nav className="p-3 space-y-1 sticky top-14">
            {sidebarNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  "w-full flex items-center h-9 rounded-md px-3 text-sm font-medium transition-all duration-200 text-left",
                  "hover:bg-accent hover:text-accent-foreground",
                  activeSection === item.id && "bg-primary/10 text-primary border-l-2 border-primary",
                  item.id === "danger" && "text-destructive hover:text-destructive hover:bg-destructive/10",
                  item.id === "danger" && activeSection === item.id && "bg-destructive/10 border-destructive"
                )}
              >
                <item.icon className="h-4 w-4 mr-3" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile nav tabs */}
        <div className="md:hidden border-b bg-background overflow-x-auto">
          <div className="flex px-4 gap-1">
            {sidebarNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors",
                  "hover:bg-accent",
                  activeSection === item.id && "bg-primary/10 text-primary",
                  item.id === "danger" && "text-destructive"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-6 space-y-8">
            {/* Profile Section */}
            <section id="section-profile">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">Profile Information</CardTitle>
                  </div>
                  <CardDescription>Your personal details and contact information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar & Identity */}
                  <div className="flex items-start gap-5">
                    <AvatarUpload
                      userId={userProfile?.id || ""}
                      authUserId={user?.id || ""}
                      currentAvatarUrl={userProfile?.avatar_url}
                      userName={userProfile?.name}
                      userEmail={userProfile?.email}
                      onAvatarChange={handleAvatarChange}
                      onAvatarRemove={handleAvatarRemove}
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-medium truncate text-base">
                        {userProfile?.name || "No name set"}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">{userProfile?.email}</p>
                      {userProfile?.role && (
                        <Badge variant={getRoleBadgeVariant(userProfile.role)} className="text-xs capitalize mt-1">
                          {userProfile.role}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Editable Fields */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, name: e.target.value }));
                          if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
                        }}
                        placeholder="Enter your full name"
                        className={formErrors.name ? "border-destructive" : ""}
                      />
                      {formErrors.name && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.name}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" value={userProfile?.email || ""} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, phone: e.target.value }));
                          if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: undefined }));
                        }}
                        placeholder="Enter your phone number"
                        className={formErrors.phone ? "border-destructive" : ""}
                      />
                      {formErrors.phone && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.phone}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input value={userProfile?.role || "user"} disabled className="bg-muted capitalize" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button onClick={handleSaveProfile} disabled={updateProfile.isPending || !hasUnsavedChanges}>
                      {updateProfile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Changes
                    </Button>
                    {hasUnsavedChanges && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        You have unsaved changes
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Display Preferences Section */}
            <section id="section-display">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">Display Preferences</CardTitle>
                  </div>
                  <CardDescription>Customize how data is displayed across the application</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select
                        value={preferences.currency}
                        onValueChange={(v) => handleDisplayPrefChange("currency", v)}
                        disabled={updatePreferences.isPending}
                      >
                        <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date Format</Label>
                      <Select
                        value={preferences.date_format}
                        onValueChange={(v) => handleDisplayPrefChange("date_format", v)}
                        disabled={updatePreferences.isPending}
                      >
                        <SelectTrigger><SelectValue placeholder="Select date format" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                          <SelectItem value="DD-MMM-YYYY">DD-MMM-YYYY</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Time Format</Label>
                      <Select
                        value={preferences.time_format}
                        onValueChange={(v) => handleDisplayPrefChange("time_format", v)}
                        disabled={updatePreferences.isPending}
                      >
                        <SelectTrigger><SelectValue placeholder="Select time format" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                          <SelectItem value="24h">24-hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Timezone</Label>
                      <Select
                        value={preferences.timezone || "UTC"}
                        onValueChange={(v) => handleDisplayPrefChange("timezone", v)}
                        disabled={updatePreferences.isPending}
                      >
                        <SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Security Section */}
            <section id="section-security">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">Security</CardTitle>
                  </div>
                  <CardDescription>Manage your password and active sessions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Key className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Password</p>
                        <p className="text-xs text-muted-foreground truncate">{formatLastPasswordChange()}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setPasswordDialogOpen(true)} className="shrink-0">
                      Change Password
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Monitor className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">Current Session</p>
                          <Badge variant="secondary" className="text-xs">This Device</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {sessionInfo.createdAt
                            ? `Signed in ${formatDistanceToNow(sessionInfo.createdAt, { addSuffix: true })}`
                            : "Active now"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSignOutDialogOpen(true)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Notifications Section */}
            <section id="section-notifications">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">Notification Preferences</CardTitle>
                  </div>
                  <CardDescription>Configure how and when you receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Delivery Methods */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Delivery Methods</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <Label className="text-sm">Email Notifications</Label>
                            <p className="text-xs text-muted-foreground">Receive notifications via email</p>
                          </div>
                        </div>
                        <Switch
                          checked={notificationSettings.emailEnabled ?? true}
                          onCheckedChange={(checked) => handleNotificationPrefChange({ emailEnabled: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <Label className="text-sm">In-App Notifications</Label>
                            <p className="text-xs text-muted-foreground">Show notifications in the app</p>
                          </div>
                        </div>
                        <Switch
                          checked={notificationSettings.inAppEnabled ?? true}
                          onCheckedChange={(checked) => handleNotificationPrefChange({ inAppEnabled: checked })}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Delivery Frequency */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Delivery Frequency</h4>
                    <Select
                      value={notificationSettings.deliveryFrequency || "instant"}
                      onValueChange={(v) => handleNotificationPrefChange({ deliveryFrequency: v })}
                    >
                      <SelectTrigger className="w-full sm:w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instant">Instant</SelectItem>
                        <SelectItem value="hourly">Hourly Digest</SelectItem>
                        <SelectItem value="daily">Daily Digest</SelectItem>
                        <SelectItem value="weekly">Weekly Digest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Module Notifications */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Modules</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {([
                        { key: "tickets" as const, label: "Tickets" },
                        { key: "assets" as const, label: "Assets" },
                        { key: "systemUpdates" as const, label: "System Updates" },
                        { key: "subscriptions" as const, label: "Subscriptions" },
                        { key: "monitoring" as const, label: "Monitoring" },
                      ]).map((module) => (
                        <div key={module.key} className="flex items-center justify-between">
                          <Label className="text-sm">{module.label}</Label>
                          <Switch
                            checked={notificationSettings.moduleNotifications?.[module.key] ?? true}
                            onCheckedChange={(checked) =>
                              handleNotificationPrefChange({
                                moduleNotifications: {
                                  ...notificationSettings.moduleNotifications,
                                  [module.key]: checked,
                                },
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Event Triggers */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Event Triggers</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {([
                        { key: "ticketAssigned", label: "Ticket assigned to me" },
                        { key: "ticketUpdated", label: "Ticket updated" },
                        { key: "slaBreaching", label: "SLA breaching" },
                        { key: "assetExpiring", label: "Asset warranty expiring" },
                        { key: "weeklyDigest", label: "Weekly summary digest" },
                      ]).map((evt) => (
                        <div key={evt.key} className="flex items-center justify-between">
                          <Label className="text-sm">{evt.label}</Label>
                          <Switch
                            checked={(notificationSettings as any).eventTriggers?.[evt.key] ?? (evt.key !== "weeklyDigest")}
                            onCheckedChange={(checked) =>
                              handleNotificationPrefChange({
                                eventTriggers: {
                                  ...(notificationSettings as any).eventTriggers,
                                  [evt.key]: checked,
                                },
                              } as any)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Danger Zone */}
            <section id="section-danger">
              <Card className="border-destructive/40">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
                  </div>
                  <CardDescription>Irreversible and destructive actions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Sign out of all sessions</p>
                      <p className="text-xs text-muted-foreground">
                        This will sign you out from all devices and browsers
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
                      onClick={() => setSignOutDialogOpen(true)}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out All
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Deactivate account</p>
                      <p className="text-xs text-muted-foreground">
                        Permanently deactivate your account. Contact your administrator.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" disabled className="text-destructive border-destructive/30 shrink-0">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deactivate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </main>
      </div>

      {/* Dialogs */}
      <ChangePasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        onPasswordChanged={() => queryClient.invalidateQueries({ queryKey: ["user-preferences"] })}
      />
      <ConfirmDialog
        open={signOutDialogOpen}
        onOpenChange={setSignOutDialogOpen}
        title="Sign Out"
        description="Are you sure you want to sign out? You will need to sign in again to access your account."
        confirmText="Sign Out"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={signOut}
      />
    </div>
  );
}
