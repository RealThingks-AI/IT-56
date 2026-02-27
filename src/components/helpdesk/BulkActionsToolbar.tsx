import { Button } from "@/components/ui/button";
import { X, Trash2, UserPlus, Edit3, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { useUsers } from "@/hooks/useUsers";
import { getUserDisplayName } from "@/lib/userUtils";

interface BulkActionsToolbarProps {
  selectedIds: number[];
  onClearSelection: () => void;
}

export const BulkActionsToolbar = ({ selectedIds, onClearSelection }: BulkActionsToolbarProps) => {
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Use centralized users hook
  const { data: users } = useUsers();

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const { error } = await supabase
        .from('helpdesk_tickets')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .in('id', selectedIds);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['unified-requests'] });
      queryClient.invalidateQueries({ queryKey: ['helpdesk-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['helpdesk-stats'] });
      toast.success(`Successfully updated ${selectedIds.length} ticket(s)`);
      onClearSelection();
    },
    onError: (error) => {
      toast.error('Failed to update tickets', {
        description: (error as Error).message
      });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('helpdesk_tickets')
        .delete()
        .in('id', selectedIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-requests'] });
      queryClient.invalidateQueries({ queryKey: ['helpdesk-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['helpdesk-stats'] });
      toast.success(`Successfully deleted ${selectedIds.length} ticket(s)`);
      onClearSelection();
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast.error('Failed to delete tickets', {
        description: (error as Error).message
      });
    }
  });

  return (
    <>
      <div className="flex items-center gap-3 p-4 bg-primary/10 border rounded-lg">
        <Badge variant="secondary" className="px-3 py-1">
          {selectedIds.length} selected
        </Badge>

        <div className="flex items-center gap-2 flex-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Actions
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Change Status
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({ field: 'status', value: 'open' })}>
                    Open
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({ field: 'status', value: 'in_progress' })}>
                    In Progress
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({ field: 'status', value: 'on_hold' })}>
                    On Hold
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({ field: 'status', value: 'resolved' })}>
                    Resolved
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({ field: 'status', value: 'closed' })}>
                    Closed
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Change Priority
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({ field: 'priority', value: 'urgent' })}>
                    Urgent
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({ field: 'priority', value: 'high' })}>
                    High
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({ field: 'priority', value: 'medium' })}>
                    Medium
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({ field: 'priority', value: 'low' })}>
                    Low
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign To
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({ field: 'assigned_to', value: null })}>
                    Unassign
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {users?.map((user) => (
                    <DropdownMenuItem 
                      key={user.id} 
                      onClick={() => bulkUpdateMutation.mutate({ field: 'assignee_id', value: user.id })}
                    >
                      {getUserDisplayName(user) || user.email}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} ticket(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected tickets
              and remove their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
