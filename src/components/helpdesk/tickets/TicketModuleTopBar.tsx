import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, FileSpreadsheet, BarChart3, Archive, Settings } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TicketModuleTopBarProps {
  showExport?: boolean;
  showReportsLink?: boolean;
  showArchiveLink?: boolean;
  showNewTicket?: boolean;
  children?: React.ReactNode;
  exportData?: any[];
  exportFilename?: string;
}

// CSV export utility
const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    toast.error("No data to export");
    return;
  }

  const headers = ["Ticket #", "Title", "Status", "Priority", "Category", "Requester", "Assignee", "Created At"];
  
  const rows = data.map(item => {
    return [
      item.ticket_number || "",
      item.title || "",
      item.status || "",
      item.priority || "",
      item.category?.name || "",
      item.requester?.name || "",
      item.assignee?.name || "",
      item.created_at || ""
    ].map(value => {
      const strVal = String(value);
      if (strVal.includes(",") || strVal.includes('"') || strVal.includes("\n")) {
        return `"${strVal.replace(/"/g, '""')}"`;
      }
      return strVal;
    }).join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  toast.success(`Exported ${data.length} records to ${filename}.csv`);
};

export function TicketModuleTopBar({ 
  showExport = true, 
  showReportsLink = true,
  showArchiveLink = true,
  showNewTicket = true,
  children,
  exportData,
  exportFilename = "tickets-export"
}: TicketModuleTopBarProps) {
  const navigate = useNavigate();

  const handleExportToExcel = () => {
    if (exportData && exportData.length > 0) {
      exportToCSV(exportData, exportFilename);
    } else {
      toast.info("No data available to export.");
    }
  };

  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
      <div className="flex items-center gap-2 px-3 py-1.5">
        {/* Left side - Children (filters from parent pages) */}
        {children}

        {/* Right side - Action buttons */}
        <div className="flex items-center gap-1 ml-auto">
          <TooltipProvider delayDuration={300}>
            {/* Reports Link */}
            {showReportsLink && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/tickets/reports")}
                    className="h-7 w-7"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">View Reports</TooltipContent>
              </Tooltip>
            )}

            {/* Archive Link */}
            {showArchiveLink && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/tickets/archive")}
                    className="h-7 w-7"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">View Archive</TooltipContent>
              </Tooltip>
            )}

            {/* Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => navigate("/tickets/settings")}>
                  Column Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/tickets/settings")}>
                  Saved Views
                </DropdownMenuItem>
                {showExport && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExportToExcel}>
                      <FileSpreadsheet className="h-3.5 w-3.5 mr-2" />
                      Export to CSV
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* New Ticket Button */}
            {showNewTicket && (
              <Button
                size="sm"
                onClick={() => navigate("/tickets/create")}
                className="gap-1 h-7 px-3"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="text-xs">New Ticket</span>
              </Button>
            )}
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
