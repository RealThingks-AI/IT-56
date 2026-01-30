import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface InternalNoteToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const InternalNoteToggle = ({ checked, onCheckedChange }: InternalNoteToggleProps) => {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id="internal-note"
        checked={checked}
        onCheckedChange={(val) => onCheckedChange(val as boolean)}
      />
      <Label 
        htmlFor="internal-note" 
        className="text-sm cursor-pointer flex items-center gap-1.5"
      >
        <Lock className="h-3.5 w-3.5" />
        Internal note
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-muted-foreground cursor-help text-xs">(i)</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Internal notes are only visible to agents, not to the requester</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Label>
    </div>
  );
};