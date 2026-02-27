import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SlidersHorizontal } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface FeedFilters {
  newAssets: boolean;
  checkedOut: boolean;
  checkedIn: boolean;
  underRepair: boolean;
  disposed: boolean;
  lost: boolean;
}

const DEFAULT_FILTERS: FeedFilters = {
  newAssets: true,
  checkedOut: true,
  checkedIn: true,
  underRepair: true,
  disposed: false,
  lost: false,
};

interface FeedSettingsDropdownProps {
  filters: FeedFilters;
  onFiltersChange: (filters: FeedFilters) => void;
}

export function FeedSettingsDropdown({
  filters,
  onFiltersChange,
}: FeedSettingsDropdownProps) {
  const toggleFilter = (key: keyof FeedFilters) => {
    onFiltersChange({
      ...filters,
      [key]: !filters[key],
    });
  };

  return (
    <DropdownMenu>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p className="text-xs">Filter Feed</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs">Show Feeds</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={filters.newAssets}
          onCheckedChange={() => toggleFilter("newAssets")}
          className="text-xs"
        >
          New Assets
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.checkedOut}
          onCheckedChange={() => toggleFilter("checkedOut")}
          className="text-xs"
        >
          Checked Out
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.checkedIn}
          onCheckedChange={() => toggleFilter("checkedIn")}
          className="text-xs"
        >
          Checked In
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.underRepair}
          onCheckedChange={() => toggleFilter("underRepair")}
          className="text-xs"
        >
          Under Repair
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.disposed}
          onCheckedChange={() => toggleFilter("disposed")}
          className="text-xs"
        >
          Disposed
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.lost}
          onCheckedChange={() => toggleFilter("lost")}
          className="text-xs"
        >
          Lost
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { DEFAULT_FILTERS };
