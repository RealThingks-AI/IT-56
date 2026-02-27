import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
interface SettingsCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
}
export function SettingsCard({
  title,
  description,
  icon: Icon,
  children,
  className,
  headerAction
}: SettingsCardProps) {
  return <Card className={cn("border-border/50", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {description && <CardDescription className="text-xs mt-0.5">{description}</CardDescription>}
          </div>
        </div>
        {headerAction && <div>{headerAction}</div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>;
}