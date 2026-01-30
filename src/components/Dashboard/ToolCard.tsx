import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ToolCardProps {
  name: string;
  icon: LucideIcon;
  path: string;
  color: string;
  isActive: boolean;
  isLocked: boolean;
  onActivate?: () => void;
}

export const ToolCard = ({
  name,
  icon: Icon,
  path,
  color,
  isActive,
  isLocked,
  onActivate,
}: ToolCardProps) => {
  if (isLocked) {
    return (
      <Card className="relative p-6 hover:shadow-md transition-all duration-[var(--transition-base)] cursor-not-allowed opacity-60">
        <div className="absolute top-4 right-4">
          <Lock className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-4`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <h3 className="font-semibold text-base mb-2">{name}</h3>
        <Badge variant="secondary" className="text-xs">Upgrade to unlock</Badge>
      </Card>
    );
  }

  if (!isActive) {
    return (
      <Card className="relative p-6 hover:shadow-md transition-all duration-[var(--transition-base)] group">
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-4`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <h3 className="font-semibold text-base mb-2">{name}</h3>
        <Button onClick={onActivate} size="sm" variant="outline" className="w-full">
          Activate Tool
        </Button>
      </Card>
    );
  }

  return (
    <Link to={path} className="group">
      <Card className="relative p-6 overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-[var(--transition-base)] cursor-pointer active:scale-[0.98]">
        <div className="relative">
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-sm group-hover:shadow-md transition-all duration-[var(--transition-base)]`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors duration-[var(--transition-fast)]">{name}</h3>
          <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-[var(--transition-fast)] flex items-center gap-1">
            Click to open
            <span className="inline-block group-hover:translate-x-0.5 transition-transform duration-[var(--transition-fast)]">→</span>
          </p>
        </div>
      </Card>
    </Link>
  );
};
