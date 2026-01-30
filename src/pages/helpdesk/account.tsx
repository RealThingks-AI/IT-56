import { useState, useEffect } from "react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { User, Settings, Loader2, Key, Shield, Bell, Monitor, Mail, LogOut, ChevronDown, AlertCircle } from "lucide-react";
import { ChangePasswordDialog } from "@/components/Profile/ChangePasswordDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AvatarUpload } from "@/components/Profile/AvatarUpload";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";
import { profileFormSchema, type ProfileFormData } from "@/lib/validationSchemas";
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
export default function AccountSettingsPage() {
  const {
    user,
    signOut
  } = useAuth();
  const queryClient = useQueryClient();
  const {
    preferences,
    updatePreferences,
    isLoading: prefsLoading
  } = useUserPreferences();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: ""
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [sessionInfo, setSessionInfo] = useState<{
    createdAt: Date | null;
  }>({
    createdAt: null
  });

  // Fetch real session data
  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (session) {
        // Use expires_at to calculate when session was created (typically 1 hour before expiry)
        // Or use the current time as a fallback for "signed in" timestamp
        const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null;
        const createdAt = expiresAt ? new Date(expiresAt.getTime() - 3600 * 1000) // Session is typically 1 hour
        : new Date();
        setSessionInfo({
          createdAt
        });
      }
    };
    fetchSession();
  }, []);
  const {
    data: userProfile,
    isLoading
  } = useQuery({
    queryKey: ["user-profile-account", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const {
        data,
        error
      } = await supabase.from("users").select("id, name, email, phone, role, avatar_url").eq("auth_user_id", user.id).single();
      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user?.id
  });
  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || "",
        phone: userProfile.phone || ""
      });
    }
  }, [userProfile]);
  const validateForm = (): boolean => {
    const result = profileFormSchema.safeParse(formData);
    if (!result.success) {
      const errors: FormErrors = {};
      result.error.errors.forEach(err => {
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
    mutationFn: async (data: {
      name: string;
      phone: string;
    }) => {
      if (!userProfile?.id) throw new Error("User not found");
      const {
        error
      } = await supabase.from("users").update({
        name: data.name,
        phone: data.phone || null
      }).eq("id", userProfile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user-profile-account"]
      });
      queryClient.invalidateQueries({
        queryKey: ["sidebar-user-profile"]
      });
      toast.success("Profile updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update profile: " + error.message);
    }
  });
  const handleSaveProfile = () => {
    if (validateForm()) {
      updateProfile.mutate(formData);
    }
  };
  const handleAvatarChange = (url: string) => {
    queryClient.invalidateQueries({
      queryKey: ["user-profile-account"]
    });
    queryClient.invalidateQueries({
      queryKey: ["sidebar-user-profile"]
    });
  };
  const handleDisplayPrefChange = (key: string, value: string) => {
    updatePreferences.mutate({
      [key]: value
    });
    toast.success("Display preference saved");
  };
  const handleNotificationPrefChange = (updates: Partial<typeof preferences.notification_settings>) => {
    const newSettings = {
      ...preferences.notification_settings,
      ...updates
    };
    updatePreferences.mutate({
      notification_settings: newSettings
    });
  };
  const formatLastPasswordChange = () => {
    if (!preferences.last_password_change) {
      return "Never changed";
    }
    const date = new Date(preferences.last_password_change);
    return `Changed ${formatDistanceToNow(date, {
      addSuffix: true
    })}`;
  };
  if (isLoading) {
    return <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>;
  }
  const notificationSettings = preferences.notification_settings || {
    deliveryFrequency: "instant",
    emailEnabled: true,
    inAppEnabled: true,
    moduleNotifications: {
      tickets: true,
      assets: true,
      systemUpdates: true,
      subscriptions: true,
      monitoring: true
    }
  };
  return <div className="p-6 space-y-6">

      {/* Profile Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Profile Information</CardTitle>
          </div>
          <CardDescription>Your personal details and display preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar & Basic Info */}
          <div className="flex items-center gap-4">
            <AvatarUpload userId={userProfile?.id || ""} authUserId={user?.id || ""} currentAvatarUrl={userProfile?.avatar_url} userName={userProfile?.name} userEmail={userProfile?.email} onAvatarChange={handleAvatarChange} />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{userProfile?.name || "No name set"}</p>
              
              
            </div>
          </div>

          <Separator />

          {/* Editable Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={formData.name} onChange={e => {
              setFormData(prev => ({
                ...prev,
                name: e.target.value
              }));
              if (formErrors.name) setFormErrors(prev => ({
                ...prev,
                name: undefined
              }));
            }} placeholder="Enter your full name" className={formErrors.name ? "border-destructive" : ""} />
              {formErrors.name && <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.name}
                </p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" value={userProfile?.email || ""} disabled className="bg-muted" />
              
            </div>
            <div className="space-y-2 sm:col-span-2 md:col-span-1">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={formData.phone} onChange={e => {
              setFormData(prev => ({
                ...prev,
                phone: e.target.value
              }));
              if (formErrors.phone) setFormErrors(prev => ({
                ...prev,
                phone: undefined
              }));
            }} placeholder="Enter your phone number" className={formErrors.phone ? "border-destructive" : ""} />
              {formErrors.phone && <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.phone}
                </p>}
            </div>
          </div>

          <Separator />

          {/* Display Preferences */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              Display Preferences
            </h4>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={preferences.currency} onValueChange={v => handleDisplayPrefChange("currency", v)} disabled={updatePreferences.isPending}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date Format</Label>
                <Select value={preferences.date_format} onValueChange={v => handleDisplayPrefChange("date_format", v)} disabled={updatePreferences.isPending}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select date format" />
                  </SelectTrigger>
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
                <Select value={preferences.time_format} onValueChange={v => handleDisplayPrefChange("time_format", v)} disabled={updatePreferences.isPending}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                    <SelectItem value="24h">24-hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={preferences.timezone || "UTC"} onValueChange={v => handleDisplayPrefChange("timezone", v)} disabled={updatePreferences.isPending}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">(GMT+0:00) UTC</SelectItem>
                    <SelectItem value="America/New_York">(GMT-5:00) Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">(GMT-6:00) Central Time</SelectItem>
                    <SelectItem value="America/Denver">(GMT-7:00) Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">(GMT-8:00) Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">(GMT+0:00) London</SelectItem>
                    <SelectItem value="Europe/Paris">(GMT+1:00) Paris</SelectItem>
                    <SelectItem value="Asia/Dubai">(GMT+4:00) Dubai</SelectItem>
                    <SelectItem value="Asia/Kolkata">(GMT+5:30) India</SelectItem>
                    <SelectItem value="Asia/Singapore">(GMT+8:00) Singapore</SelectItem>
                    <SelectItem value="Asia/Tokyo">(GMT+9:00) Tokyo</SelectItem>
                    <SelectItem value="Australia/Sydney">(GMT+11:00) Sydney</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
              {updateProfile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card>
        <CardHeader className="pb-4">
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
                  {sessionInfo.createdAt ? `Signed in ${formatDistanceToNow(sessionInfo.createdAt, {
                  addSuffix: true
                })}` : "Active now"}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSignOutDialogOpen(true)} className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Section - Collapsible */}
      <Card>
        <Collapsible open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Notification Preferences</CardTitle>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${notificationsOpen ? "rotate-180" : ""}`} />
              </div>
              <CardDescription>Configure how and when you receive notifications</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6 pt-0">
              <Separator />
              
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
                    <Switch checked={notificationSettings.emailEnabled ?? true} onCheckedChange={checked => handleNotificationPrefChange({
                    emailEnabled: checked
                  })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-sm">In-App Notifications</Label>
                        <p className="text-xs text-muted-foreground">Show notifications in the app</p>
                      </div>
                    </div>
                    <Switch checked={notificationSettings.inAppEnabled ?? true} onCheckedChange={checked => handleNotificationPrefChange({
                    inAppEnabled: checked
                  })} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Module Notifications */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Modules</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[{
                  key: "tickets" as const,
                  label: "Tickets"
                }, {
                  key: "assets" as const,
                  label: "Assets"
                }, {
                  key: "systemUpdates" as const,
                  label: "System Updates"
                }, {
                  key: "subscriptions" as const,
                  label: "Subscriptions"
                }, {
                  key: "monitoring" as const,
                  label: "Monitoring"
                }].map(module => <div key={module.key} className="flex items-center justify-between">
                      <Label className="text-sm">{module.label}</Label>
                      <Switch checked={notificationSettings.moduleNotifications?.[module.key] ?? true} onCheckedChange={checked => handleNotificationPrefChange({
                    moduleNotifications: {
                      ...notificationSettings.moduleNotifications,
                      [module.key]: checked
                    }
                  })} />
                    </div>)}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Dialogs */}
      <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} onPasswordChanged={() => queryClient.invalidateQueries({
      queryKey: ["user-preferences"]
    })} />
      
      <ConfirmDialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen} title="Sign Out" description="Are you sure you want to sign out? You will need to sign in again to access your account." confirmText="Sign Out" cancelText="Cancel" variant="destructive" onConfirm={signOut} />
    </div>;
}