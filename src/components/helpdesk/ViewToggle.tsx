import { Button } from "@/components/ui/button";
import { List, LayoutGrid } from "lucide-react";

interface ViewToggleProps {
  view: "table" | "card";
  onViewChange: (view: "table" | "card") => void;
}

export const ViewToggle = ({
  view,
  onViewChange
}: ViewToggleProps) => {
  return (
    <div className="flex items-center border rounded-md">
      <Button
        variant={view === "table" ? "secondary" : "ghost"}
        size="icon"
        className="h-7 w-7 rounded-r-none"
        onClick={() => onViewChange("table")}
        aria-label="Table view"
      >
        <List className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={view === "card" ? "secondary" : "ghost"}
        size="icon"
        className="h-7 w-7 rounded-l-none"
        onClick={() => onViewChange("card")}
        aria-label="Card view"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
