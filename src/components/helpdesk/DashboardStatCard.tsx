import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DashboardStatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  href?: string;
  subtitle?: string;
}

export function DashboardStatCard({ title, value, icon: Icon, color, href, subtitle }: DashboardStatCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (href) {
      navigate(href);
    }
  };

  return (
    <Card 
      className={`transition-all min-h-[100px] ${href ? 'cursor-pointer hover:shadow-md hover:scale-105' : ''}`}
      onClick={handleClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold min-h-[32px]">{value}</div>
        <p className={`text-xs text-muted-foreground mt-1 min-h-[16px] ${!subtitle ? 'invisible' : ''}`}>
          {subtitle || '\u00A0'}
        </p>
      </CardContent>
    </Card>
  );
}
