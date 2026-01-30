// Centralized asset status constants matching database CHECK constraint
export const ASSET_STATUS = {
  AVAILABLE: 'available',
  IN_USE: 'in_use',
  MAINTENANCE: 'maintenance',
  RETIRED: 'retired',
  DISPOSED: 'disposed',
  LOST: 'lost',
} as const;

export type AssetStatus = typeof ASSET_STATUS[keyof typeof ASSET_STATUS];

// User-friendly labels for display
export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  [ASSET_STATUS.AVAILABLE]: 'Available',
  [ASSET_STATUS.IN_USE]: 'Checked Out',
  [ASSET_STATUS.MAINTENANCE]: 'Under Maintenance',
  [ASSET_STATUS.RETIRED]: 'Retired',
  [ASSET_STATUS.DISPOSED]: 'Disposed',
  [ASSET_STATUS.LOST]: 'Lost',
};

// Status options for forms/select components
export const ASSET_STATUS_OPTIONS = [
  { value: ASSET_STATUS.AVAILABLE, label: 'Available' },
  { value: ASSET_STATUS.IN_USE, label: 'In Use' },
  { value: ASSET_STATUS.MAINTENANCE, label: 'Under Maintenance' },
  { value: ASSET_STATUS.RETIRED, label: 'Retired' },
  { value: ASSET_STATUS.DISPOSED, label: 'Disposed' },
  { value: ASSET_STATUS.LOST, label: 'Lost' },
];

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
    case ASSET_STATUS.RETIRED:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    case ASSET_STATUS.DISPOSED:
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case ASSET_STATUS.LOST:
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  }
};
