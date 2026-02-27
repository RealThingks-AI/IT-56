import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, Link as LinkIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getUserDisplayName } from "@/lib/userUtils";
import { formatStatus } from "@/lib/ticketUtils";
import { FormattedDate } from "@/components/FormattedDate";

interface ProblemTableViewProps {
  problems: any[];
  selectedIds: number[];
  onSelectProblem: (id: number) => void;
  onSelectAll: (checked: boolean) => void;
  onEditProblem?: (problem: any) => void;
  onAssignProblem?: (problem: any) => void;
  onQuickStatusChange?: (problemId: number, status: string) => void;
}

// ITIL-aligned problem status options
const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'known_error', label: 'Known Error' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

// Status dot color
const getStatusDotColor = (status: string) => {
  switch (status) {
    case 'open': return 'bg-blue-500';
    case 'investigating': return 'bg-purple-500';
    case 'known_error': return 'bg-amber-500';
    case 'resolved': return 'bg-green-500';
    case 'closed': return 'bg-gray-400';
    default: return 'bg-gray-400';
  }
};

// Priority text color
const getPriorityTextColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'text-red-600 dark:text-red-400 font-semibold';
    case 'high': return 'text-orange-600 dark:text-orange-400 font-medium';
    case 'medium': return 'text-yellow-600 dark:text-yellow-400';
    case 'low': return 'text-muted-foreground';
    default: return 'text-muted-foreground';
  }
};

export const ProblemTableView = ({ 
  problems, 
  selectedIds, 
  onSelectProblem, 
  onSelectAll,
  onEditProblem,
  onAssignProblem,
  onQuickStatusChange
}: ProblemTableViewProps) => {
  const navigate = useNavigate();

  const getRowClassName = (problem: any) => {
    const classes = ["cursor-pointer hover:bg-muted/50 h-10"];
    
    // Known error - amber indicator
    if (problem.status === 'known_error') {
      classes.push("bg-amber-50/30 dark:bg-amber-950/5");
    }
    // Unassigned active problem
    else if (!problem.assigned_to && ['open', 'investigating'].includes(problem.status)) {
      classes.push("bg-yellow-50/30 dark:bg-yellow-950/5");
    }
    
    // Priority left border
    if (problem.priority === 'urgent') {
      classes.push("border-l-2 border-l-red-500");
    } else if (problem.priority === 'high') {
      classes.push("border-l-2 border-l-orange-500");
    }
    
    return cn(...classes);
  };

  const getRCAStatus = (problem: any) => {
    if (problem.root_cause) {
      return <span className="text-xs text-green-600 dark:text-green-400">Done</span>;
    }
    return <span className="text-xs text-muted-foreground">Pending</span>;
  };

  if (problems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-muted-foreground mb-2">No problems found</div>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or create a new problem.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="border-0 overflow-auto h-full">
        <Table>
          <TableHeader>
            <TableRow className="h-8 bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-8 py-1.5">
                <Checkbox
                  checked={selectedIds.length === problems.length && problems.length > 0}
                  onCheckedChange={onSelectAll}
                  aria-label="Select all problems"
                />
              </TableHead>
              <TableHead className="py-1.5 text-xs font-medium w-[90px]">#</TableHead>
              <TableHead className="py-1.5 text-xs font-medium">Title</TableHead>
              <TableHead className="py-1.5 text-xs font-medium w-[100px]">Status</TableHead>
              <TableHead className="py-1.5 text-xs font-medium w-[70px]">Priority</TableHead>
              <TableHead className="py-1.5 text-xs font-medium w-[110px]">Assignee</TableHead>
              <TableHead className="py-1.5 text-xs font-medium w-[90px]">Category</TableHead>
              <TableHead className="py-1.5 text-xs font-medium w-[60px]">Tickets</TableHead>
              <TableHead className="py-1.5 text-xs font-medium w-[60px]">RCA</TableHead>
              <TableHead className="py-1.5 text-xs font-medium w-[90px]">Created</TableHead>
              <TableHead className="py-1.5 text-xs font-medium w-[50px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {problems.map((problem) => (
              <TableRow key={problem.id} className={getRowClassName(problem)}>
                <TableCell onClick={(e) => e.stopPropagation()} className="py-1">
                  <Checkbox
                    checked={selectedIds.includes(problem.id)}
                    onCheckedChange={() => onSelectProblem(problem.id)}
                    aria-label={`Select problem ${problem.problem_number}`}
                  />
                </TableCell>
                <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1">
                  <span className="font-mono text-xs text-muted-foreground">
                    {problem.problem_number}
                  </span>
                </TableCell>
                <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1">
                  <span className="text-sm truncate block max-w-[300px]" title={problem.title}>
                    {problem.title}
                  </span>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()} className="py-1">
                  {onQuickStatusChange ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                          <span className="flex items-center gap-1.5 cursor-pointer">
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStatusDotColor(problem.status))} />
                            <span className="text-xs">{formatStatus(problem.status)}</span>
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuLabel className="text-xs">Change Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {statusOptions.map((option) => (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => onQuickStatusChange(problem.id, option.value)}
                            className={`text-xs ${problem.status === option.value ? 'bg-accent' : ''}`}
                          >
                            {option.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStatusDotColor(problem.status))} />
                      <span className="text-xs">{formatStatus(problem.status)}</span>
                    </span>
                  )}
                </TableCell>
                <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1">
                  <span className={cn("text-xs capitalize", getPriorityTextColor(problem.priority))}>
                    {problem.priority}
                  </span>
                </TableCell>
                <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1">
                  <span className="text-xs truncate block max-w-[100px]">
                    {getUserDisplayName(problem.assigned_to_user) || (
                      <span className="text-muted-foreground italic">Unassigned</span>
                    )}
                  </span>
                </TableCell>
                <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1">
                  <span className="text-xs text-muted-foreground truncate block max-w-[80px]">
                    {problem.category?.name || '-'}
                  </span>
                </TableCell>
                <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1">
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex items-center gap-1">
                        <LinkIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">{problem.linked_tickets?.length || 0}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{problem.linked_tickets?.length || 0} linked tickets</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1">
                  {getRCAStatus(problem)}
                </TableCell>
                <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1">
                  <span className="text-xs text-muted-foreground">
                    <FormattedDate date={problem.created_at} format="short" />
                  </span>
                </TableCell>
                <TableCell className="py-1 text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="More actions">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={() => navigate(`/helpdesk/problems/${problem.id}`)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEditProblem?.(problem)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAssignProblem?.(problem)}>
                        Assign
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
};
