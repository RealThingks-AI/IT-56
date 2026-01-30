// Shared utility functions for ticket module

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'open': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'resolved': return 'bg-green-100 text-green-800 border-green-300';
    case 'closed': return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'on_hold': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'fulfilled': return 'bg-green-100 text-green-800 border-green-300';
    case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'bg-red-500 hover:bg-red-600 text-white';
    case 'high': return 'bg-orange-500 hover:bg-orange-600 text-white';
    case 'medium': return 'bg-yellow-500 hover:bg-yellow-600 text-white';
    case 'low': return 'bg-green-500 hover:bg-green-600 text-white';
    default: return 'bg-gray-500 hover:bg-gray-600 text-white';
  }
};

export const getPriorityBadgeColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'bg-red-500';
    case 'high': return 'bg-orange-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

export const isSLABreached = (ticket: { 
  sla_breached?: boolean; 
  sla_due_date?: string; 
  status: string 
}) => {
  if (ticket.sla_breached) return true;
  if (ticket.sla_due_date && new Date(ticket.sla_due_date) < new Date() && 
      !['resolved', 'closed'].includes(ticket.status)) {
    return true;
  }
  return false;
};

export const formatStatus = (status: string) => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Column configuration for ticket table
export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
}

export const defaultTicketColumns: ColumnConfig[] = [
  { id: 'ticket_number', label: 'Request #', visible: true },
  { id: 'type', label: 'Type', visible: true },
  { id: 'title', label: 'Title', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'priority', label: 'Priority', visible: true },
  { id: 'assignee', label: 'Assignee', visible: true },
  { id: 'created_by', label: 'Created By', visible: true },
  { id: 'category', label: 'Category', visible: true },
  { id: 'created_at', label: 'Created', visible: true },
];
