import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  onClick?: () => void;
}
export const StatsCard = ({
  title,
  value,
  icon: Icon,
  color,
  onClick
}: StatsCardProps) => {
  return (
    <Card 
      className={`group relative p-6 overflow-hidden transition-all duration-[var(--transition-base)] border hover:shadow-md ${onClick ? 'cursor-pointer hover:border-primary/20 active:scale-[0.98]' : ''}`}
      onClick={onClick}
    >
      <div className="relative flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide group-hover:text-foreground transition-colors">
            {title}
          </p>
          <h3 className="text-3xl font-semibold text-foreground">
            {value}
          </h3>
        </div>
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-[var(--transition-base)]`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </Card>
  );
};