import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Eye, UserPlus, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserDisplayName } from "@/lib/userUtils";

interface ProblemTableViewProps {
  problems: any[];
  selectedIds: number[];
  onSelectProblem: (id: number) => void;
  onSelectAll: (checked: boolean) => void;
  onEditProblem?: (problem: any) => void;
  onAssignProblem?: (problem: any) => void;
  onQuickStatusChange?: (problemId: number, status: string) => void;
}

const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'known_error', label: 'Known Error' },
];

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700';
      case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700';
      case 'known_error': return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700';
      default: return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 hover:bg-red-600 text-white';
      case 'high': return 'bg-orange-500 hover:bg-orange-600 text-white';
      case 'medium': return 'bg-yellow-500 hover:bg-yellow-600 text-white';
      case 'low': return 'bg-green-500 hover:bg-green-600 text-white';
      default: return 'bg-gray-500 hover:bg-gray-600 text-white';
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden text-[0.85rem]">
      <Table>
        <TableHeader>
          <TableRow className="h-9 bg-muted/30">
            <TableHead className="w-10 py-2">
              <Checkbox
                checked={selectedIds.length === problems.length && problems.length > 0}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead className="py-2 font-medium">Problem #</TableHead>
            <TableHead className="py-2 font-medium">Title</TableHead>
            <TableHead className="py-2 font-medium">Status</TableHead>
            <TableHead className="py-2 font-medium">Priority</TableHead>
            <TableHead className="py-2 font-medium">Assignee</TableHead>
            <TableHead className="py-2 font-medium">Created By</TableHead>
            <TableHead className="py-2 font-medium">Category</TableHead>
            <TableHead className="py-2 font-medium">Created</TableHead>
            <TableHead className="text-right py-2 font-medium">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {problems.map((problem) => (
            <TableRow key={problem.id} className="cursor-pointer hover:bg-muted/50 h-11">
              <TableCell onClick={(e) => e.stopPropagation()} className="py-1.5">
                <Checkbox
                  checked={selectedIds.includes(problem.id)}
                  onCheckedChange={() => onSelectProblem(problem.id)}
                />
              </TableCell>
              <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1.5">
                <span className="font-mono text-[0.85rem]">
                  {problem.problem_number}
                </span>
              </TableCell>
              <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1.5">
                <div className="max-w-sm">
                  <div className="font-medium truncate text-[0.85rem]">{problem.title}</div>
                  <div className="text-[0.75rem] text-muted-foreground truncate">
                    {problem.description}
                  </div>
                </div>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()} className="py-1.5">
                {onQuickStatusChange ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                        <Badge variant="outline" className={`${getStatusColor(problem.status)} text-[0.75rem] px-1.5 py-0.5 cursor-pointer`}>
                          {problem.status.replace('_', ' ')}
                        </Badge>
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
                  <Badge variant="outline" className={`${getStatusColor(problem.status)} text-[0.75rem] px-1.5 py-0.5`}>
                    {problem.status.replace('_', ' ')}
                  </Badge>
                )}
              </TableCell>
              <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1.5">
                <Badge className={`${getPriorityColor(problem.priority)} text-[0.75rem] px-1.5 py-0.5`}>
                  {problem.priority}
                </Badge>
              </TableCell>
              <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1.5">
                {getUserDisplayName(problem.assigned_to_user) || (
                  <span className="text-muted-foreground italic text-[0.8rem]">Unassigned</span>
                )}
              </TableCell>
              <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1.5">
                {getUserDisplayName(problem.created_by_user) || (
                  <span className="text-muted-foreground italic text-[0.8rem]">Unknown</span>
                )}
              </TableCell>
              <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1.5">
                {problem.category?.name || '-'}
              </TableCell>
              <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1.5">
                <div className="text-[0.8rem]">
                  {format(new Date(problem.created_at), 'MMM dd, yyyy')}
                </div>
              </TableCell>
              <TableCell className="text-right py-1.5" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => navigate(`/helpdesk/problems/${problem.id}`)}
                    title="View"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem 
                        onClick={() => onEditProblem?.(problem)}
                        className="text-xs gap-2"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onAssignProblem?.(problem)}
                        className="text-xs gap-2"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Assign
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
