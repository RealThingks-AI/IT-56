// Centralized asset status constants matching database CHECK constraint
export const ASSET_STATUS = {
  AVAILABLE: 'available',
  IN_USE: 'in_use',
  MAINTENANCE: 'maintenance',
  DISPOSED: 'disposed',
} as const;

// Hardcoded threshold for "overdue" confirmation (days since last verified)
export const CONFIRMATION_OVERDUE_DAYS = 60;

export type AssetStatus = typeof ASSET_STATUS[keyof typeof ASSET_STATUS];

// User-friendly labels for display
export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  [ASSET_STATUS.AVAILABLE]: 'In Stock',
  [ASSET_STATUS.IN_USE]: 'Checked Out',
  [ASSET_STATUS.MAINTENANCE]: 'Repair',
  [ASSET_STATUS.DISPOSED]: 'Disposed',
};

// Status options for forms/select components
export const ASSET_STATUS_OPTIONS = [
  { value: ASSET_STATUS.AVAILABLE, label: 'In Stock' },
  { value: ASSET_STATUS.IN_USE, label: 'Checked Out' },
  { value: ASSET_STATUS.MAINTENANCE, label: 'Repair' },
  { value: ASSET_STATUS.DISPOSED, label: 'Disposed' },
];

// Options for Add Asset form — excludes "Checked Out" since it requires checkout workflow
export const ASSET_STATUS_OPTIONS_FOR_CREATE = ASSET_STATUS_OPTIONS.filter(
  (opt) => opt.value !== ASSET_STATUS.IN_USE
);

// Validate that a status transition is valid given assignment state
// locationId can satisfy the "checked out" requirement when checking out to a location
export const validateStatusTransition = (
  newStatus: string,
  assignedTo: string | null | undefined,
  locationId?: string | null
): string | null => {
  if (newStatus === ASSET_STATUS.IN_USE && !assignedTo && !locationId) {
    return 'Cannot set status to "Checked Out" without assigning to a user or location. Use the Check Out workflow instead.';
  }
  return null;
};

// Get display label for a status
export const getStatusLabel = (status: string | null): string => {
  if (!status) return 'Unknown';
  return ASSET_STATUS_LABELS[status as AssetStatus] || status.replace('_', ' ');
};

// Check if status allows check-out
export const canCheckOut = (status: string | null): boolean => {
  return status === ASSET_STATUS.AVAILABLE;
};

// Check if status allows check-in
export const canCheckIn = (status: string | null): boolean => {
  return status === ASSET_STATUS.IN_USE;
};

// Get status badge color class
export const getStatusBadgeColor = (status: string | null): string => {
  switch (status) {
    case ASSET_STATUS.AVAILABLE:
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case ASSET_STATUS.IN_USE:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case ASSET_STATUS.MAINTENANCE:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case ASSET_STATUS.DISPOSED:
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  }
};
