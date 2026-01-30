import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, LucideIcon } from "lucide-react";

interface ReportCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  count?: number;
  onGenerate: () => void;
  disabled?: boolean;
}

export const ReportCard = ({ title, description, icon: Icon, count, onGenerate, disabled }: ReportCardProps) => {
  return (
    <Card className="p-3 hover:shadow-md transition-shadow border hover:border-primary/50">
      <div className="flex items-start justify-between mb-2">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        {count !== undefined && (
          <div className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {count} records
          </div>
        )}
      </div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground mb-2.5 line-clamp-2">{description}</p>
      <Button 
        size="sm" 
        variant="outline" 
        className="w-full h-7 text-xs" 
        onClick={onGenerate} 
        disabled={disabled || count === 0}
      >
        <Download className="h-3 w-3 mr-1.5" />
        Generate
      </Button>
    </Card>
  );
};
