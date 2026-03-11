import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow, format } from "date-fns";

interface FeedRowProps {
  tag: string;
  col2?: string;
  col3?: string;
  col4?: string;
  date?: string;
  onClick: () => void;
  index?: number;
}

export const FeedRow = ({ tag, col2, date, onClick, index }: FeedRowProps) => {
  const relativeDate = date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : "";
  const fullDate = date ? format(new Date(date), "MMM dd, yyyy h:mm a") : "";

  const dateEl = date ? (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-[11px] text-muted-foreground tabular-nums cursor-default">{relativeDate}</span>
        </TooltipTrigger>
        <TooltipContent side="top"><p className="text-xs">{fullDate}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : null;

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,0.3fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)]",
        "items-center gap-1.5 px-2.5 py-[5px] cursor-pointer transition-all duration-100 group",
        "hover:bg-accent/50 hover:border-l-2 hover:border-l-primary hover:pl-[10px]",
        "border-l-2 border-l-transparent",
        index !== undefined && index % 2 === 1 && "bg-muted/20"
      )}
      onClick={onClick}
    >
      <span className="text-[11px] text-muted-foreground tabular-nums">{index !== undefined ? index + 1 : ""}</span>
      <span className="text-xs font-semibold text-primary truncate font-mono">{tag}</span>
      <span className="text-xs text-muted-foreground truncate">{col2 || "—"}</span>
      <div className="flex items-center justify-end gap-1">
        {dateEl}
        <ChevronRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors" />
      </div>
    </div>
  );
};