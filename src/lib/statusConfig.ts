// Central status and priority configuration for ITSM module
// This file provides a single source of truth for all status/priority colors and labels

export const STATUS_CONFIG = {
  // Ticket statuses
  open: {
    label: 'Open',
    color: '#3b82f6', // blue-500
    bgClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
    iconClass: 'text-blue-500',
  },
  in_progress: {
    label: 'In Progress',
    color: '#8b5cf6', // purple-500
    bgClass: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700',
    iconClass: 'text-purple-500',
  },
  on_hold: {
    label: 'On Hold',
    color: '#eab308', // yellow-500
    bgClass: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
    iconClass: 'text-yellow-500',
  },
  resolved: {
    label: 'Resolved',
    color: '#22c55e', // green-500
    bgClass: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
    iconClass: 'text-green-500',
  },
  closed: {
    label: 'Closed',
    color: '#6b7280', // gray-500
    bgClass: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700',
    iconClass: 'text-gray-500',
  },
  pending: {
    label: 'Pending',
    color: '#eab308', // yellow-500
    bgClass: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
    iconClass: 'text-yellow-500',
  },
  fulfilled: {
    label: 'Fulfilled',
    color: '#22c55e', // green-500
    bgClass: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
    iconClass: 'text-green-500',
  },
  rejected: {
    label: 'Rejected',
    color: '#ef4444', // red-500
    bgClass: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
    iconClass: 'text-red-500',
  },
  // Problem-specific statuses
  investigating: {
    label: 'Investigating',
    color: '#8b5cf6', // purple-500
    bgClass: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700',
    iconClass: 'text-purple-500',
  },
  known_error: {
    label: 'Known Error',
    color: '#f59e0b', // amber-500
    bgClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700 font-semibold',
    iconClass: 'text-amber-500',
  },
} as const;

export const PRIORITY_CONFIG = {
  urgent: {
    label: 'Urgent',
    color: 'hsl(var(--destructive))',
    bgClass: 'bg-red-500 hover:bg-red-600 text-white',
    badgeClass: 'bg-red-500',
    iconClass: 'text-red-500',
  },
  high: {
    label: 'High',
    color: '#f97316', // orange-500
    bgClass: 'bg-orange-500 hover:bg-orange-600 text-white',
    badgeClass: 'bg-orange-500',
    iconClass: 'text-orange-500',
  },
  medium: {
    label: 'Medium',
    color: '#eab308', // yellow-500
    bgClass: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    badgeClass: 'bg-yellow-500',
    iconClass: 'text-yellow-500',
  },
  low: {
    label: 'Low',
    color: '#22c55e', // green-500
    bgClass: 'bg-green-500 hover:bg-green-600 text-white',
    badgeClass: 'bg-green-500',
    iconClass: 'text-green-500',
  },
} as const;

// SLA Status configuration
export const SLA_STATUS_CONFIG = {
  breached: {
    label: 'Breached',
    color: '#ef4444',
    bgClass: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400',
    iconClass: 'text-red-500',
  },
  at_risk: {
    label: 'At Risk',
    color: '#f97316',
    bgClass: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400',
    iconClass: 'text-orange-500',
  },
  on_track: {
    label: 'On Track',
    color: '#22c55e',
    bgClass: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400',
    iconClass: 'text-green-500',
  },
} as const;

// Chart colors for consistency
export const CHART_STATUS_COLORS = {
  open: STATUS_CONFIG.open.color,
  in_progress: STATUS_CONFIG.in_progress.color,
  on_hold: STATUS_CONFIG.on_hold.color,
  resolved: STATUS_CONFIG.resolved.color,
  closed: STATUS_CONFIG.closed.color,
  investigating: STATUS_CONFIG.investigating.color,
  known_error: STATUS_CONFIG.known_error.color,
};

export const CHART_PRIORITY_COLORS = {
  urgent: 'hsl(var(--destructive))',
  high: PRIORITY_CONFIG.high.color,
  medium: PRIORITY_CONFIG.medium.color,
  low: PRIORITY_CONFIG.low.color,
};

// Helper functions
export function getStatusConfig(status: string) {
  return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.open;
}

export function getPriorityConfig(priority: string) {
  return PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
}

export function getSLAStatus(ticket: { sla_breached?: boolean; sla_due_date?: string; status: string }) {
  if (ticket.sla_breached) return 'breached';
  if (!ticket.sla_due_date) return 'on_track';
  if (['resolved', 'closed'].includes(ticket.status)) return 'on_track';
  
  const dueDate = new Date(ticket.sla_due_date);
  const now = new Date();
  const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (dueDate < now) return 'breached';
  if (hoursUntilDue < 2) return 'at_risk';
  return 'on_track';
}
