import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ProfileCard } from "@/components/Profile/ProfileCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User } from "lucide-react";

const PersonalInfo = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

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

  useEffect(() => {
    if (!isEditing && userData) {
      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        phone: userData.phone || "",
      });
    }
  }, [userData, isEditing]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string }) => {
      const { data: updated, error: updateError } = await supabase
        .from("users")
        .update({
          name: data.name,
          phone: data.phone,
        })
        .eq("auth_user_id", user?.id)
        .select("id, name, phone, email")
        .single();

      if (updateError) throw updateError;
      return updated;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["user-profile", user?.id],
      });
      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your full name before saving.",
        variant: "destructive",
      });
      return;
    }
    updateProfileMutation.mutate({
      name: formData.name,
      phone: formData.phone,
    });
  };

  const handleCancel = () => {
    if (userData) {
      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        phone: userData.phone || "",
      });
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4">
      <div>
        <h1 className="text-2xl font-normal">Personal info</h1>
        <p className="text-muted-foreground mt-1">
          Info about you and your preferences across RT-IT-Hub
        </p>
      </div>

      <div className="grid gap-4">
        <ProfileCard
          title="Your profile info"
          description="Personal info and options to manage it"
          icon={
            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
          }
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              {isEditing ? (
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter your full name"
                />
              ) : (
                <p className="text-sm">{formData.name || "Not set"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{formData.email}</p>
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>
              {isEditing ? (
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="Enter phone number"
                />
              ) : (
                <p className="text-sm">{formData.phone || "Not set"}</p>
              )}
            </div>

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button onClick={handleSave} disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>Edit</Button>
              )}
            </div>
          </div>
        </ProfileCard>
      </div>
    </div>
  );
};

export default PersonalInfo;
