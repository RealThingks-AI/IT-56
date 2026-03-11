import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  icon: React.ElementType;
  value: number | string;
  label: string;
  colorClass: string;
  onClick?: () => void;
  active?: boolean;
}

export const StatCard = ({ icon: Icon, value, label, colorClass, onClick, active }: StatCardProps) => (
  <Card className={`transition-all duration-200 ${onClick ? "cursor-pointer hover:border-primary/30 hover:scale-[1.02]" : ""} ${active ? "border-2 border-primary" : ""}`} onClick={onClick}>
    <CardContent className="p-2.5 flex items-center gap-2.5">
      <div className={`p-1.5 rounded-lg ${colorClass}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div>
        <p className="text-lg font-bold leading-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  </Card>
);