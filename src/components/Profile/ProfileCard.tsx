import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface ProfileCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export const ProfileCard = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  children,
}: ProfileCardProps) => {
  return (
    <Card className="border-border/50 hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            {actionLabel && (
              <Button variant="link" onClick={onAction} className="px-0">
                {actionLabel}
              </Button>
            )}
            {icon && <div>{icon}</div>}
          </div>
        </div>
      </CardHeader>
      {children && (
        <CardContent>
          {children}
        </CardContent>
      )}
    </Card>
  );
};
