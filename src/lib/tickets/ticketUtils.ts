// Shared utility functions for ticket module
import { STATUS_CONFIG, PRIORITY_CONFIG, SLA_STATUS_CONFIG, getSLAStatus as getSLAStatusFromConfig } from './statusConfig';

export const getStatusColor = (status: string) => {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  if (config) return config.bgClass;
  return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700';
};

export const getPriorityColor = (priority: string) => {
  const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG];
  if (config) return config.bgClass;
  return 'bg-gray-500 hover:bg-gray-600 text-white';
};

export const getPriorityBadgeColor = (priority: string) => {
  const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG];
  if (config) return config.badgeClass;
  return 'bg-gray-500';
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

export const getSLAStatusBadge = (ticket: { sla_breached?: boolean; sla_due_date?: string; status: string }) => {
  const slaStatus = getSLAStatusFromConfig(ticket);
  return SLA_STATUS_CONFIG[slaStatus];
};

export const formatStatus = (status: string) => {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  if (config) return config.label;
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
  { id: 'sla_due_date', label: 'SLA Due', visible: true },
  { id: 'sla_status', label: 'SLA Status', visible: true },
  { id: 'created_at', label: 'Created', visible: true },
];
