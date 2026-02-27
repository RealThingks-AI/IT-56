import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface AvatarUploadProps {
  userId: string;
  authUserId: string;
  currentAvatarUrl?: string | null;
  userName?: string | null;
  userEmail?: string;
  onAvatarChange: (url: string) => void;
  onAvatarRemove?: () => void;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function AvatarUpload({
  userId,
  authUserId,
  currentAvatarUrl,
  userName,
  userEmail,
  onAvatarChange,
  onAvatarRemove,
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name?: string | null) => {
    if (!name) return userEmail?.charAt(0).toUpperCase() || "U";
    return name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Invalid file type. Please upload a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File is too large. Maximum size is 2MB.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${authUserId}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      onAvatarChange(publicUrl);
      toast.success("Profile photo updated successfully");
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast.error(error.message || "Failed to upload profile photo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setIsRemoving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ avatar_url: null })
        .eq("id", userId);

      if (error) throw error;

      onAvatarRemove?.();
      toast.success("Profile photo removed");
    } catch (error: any) {
      console.error("Avatar remove error:", error);
      toast.error(error.message || "Failed to remove profile photo");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Avatar className="h-16 w-16">
          <AvatarImage src={currentAvatarUrl || undefined} alt={userName || "User avatar"} />
          <AvatarFallback className="text-lg bg-primary/10 text-primary">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
        <Button
          size="icon"
          variant="outline"
          className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Camera className="h-3 w-3" />
          )}
        </Button>
      </div>
      {currentAvatarUrl && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleRemoveAvatar}
          disabled={isRemoving}
        >
          {isRemoving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
          Remove
        </Button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
