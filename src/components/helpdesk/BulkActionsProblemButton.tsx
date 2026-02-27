import { Button } from "@/components/ui/button";
import { Trash2, UserPlus, Edit3, ChevronDown } from "lucide-react";
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

interface BulkActionsProblemButtonProps {
  selectedIds: number[];
  onClearSelection: () => void;
}

export const BulkActionsProblemButton = ({ selectedIds, onClearSelection }: BulkActionsProblemButtonProps) => {
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Use centralized users hook
  const { data: users } = useUsers();

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const { error } = await supabase
        .from('helpdesk_problems')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .in('id', selectedIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-problems'] });
      toast.success(`Successfully updated ${selectedIds.length} problem(s)`);
      onClearSelection();
    },
    onError: (error) => {
      toast.error('Failed to update problems', {
        description: (error as Error).message
      });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('bulk_soft_delete_problems', {
        problem_ids: selectedIds
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-problems'] });
      toast.success(`Successfully deleted ${selectedIds.length} problem(s)`);
      onClearSelection();
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast.error('Failed to delete problems', {
        description: (error as Error).message
      });
    }
  });

  if (selectedIds.length === 0) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7">
            Actions ({selectedIds.length})
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
              <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({ field: 'status', value: 'resolved' })}>
                Resolved
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({ field: 'status', value: 'closed' })}>
                Closed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({ field: 'status', value: 'known_error' })}>
                Known Error
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
                  onClick={() => bulkUpdateMutation.mutate({ field: 'assigned_to', value: user.auth_user_id })}
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} problem(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected problems
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
