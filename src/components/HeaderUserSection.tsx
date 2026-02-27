import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useSessionStore } from "@/stores/useSessionStore";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NotificationPanel } from "@/components/NotificationPanel";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shield, User, LogOut } from "lucide-react";

export function HeaderUserSection() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const storeName = useSessionStore(s => s.name);

  const { data: userProfile } = useQuery({
    queryKey: ["header-user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("users")
        .select("name, email, avatar_url")
        .eq("auth_user_id", user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const userName = storeName || userProfile?.name || user?.user_metadata?.name || "User";
  const userEmail = userProfile?.email || user?.email || "";
  const avatarUrl = userProfile?.avatar_url;

  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-1">
      <NotificationPanel />
      <Separator orientation="vertical" className="h-5 mx-1" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 px-2">
            <Avatar className="h-8 w-8 border-2 border-primary/30 ring-1 ring-primary/10">
              <AvatarImage src={avatarUrl || undefined} alt={userName} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-[11px]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm font-semibold text-foreground truncate max-w-[120px]">
              {userName}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium text-foreground">{userName}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/account")}>
            <User className="mr-2 h-4 w-4" />
            My Account
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem onClick={() => navigate("/admin/users")}>
              <Shield className="mr-2 h-4 w-4" />
              Admin Panel
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
