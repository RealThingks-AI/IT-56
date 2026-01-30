/**
 * Format a date according to the system timezone setting
 * @param date - Date to format
 * @param timezone - IANA timezone string (e.g., 'America/New_York', 'Asia/Kolkata')
 * @param options - Intl.DateTimeFormatOptions for customizing the output
 */
export function formatDateWithTimezone(
  date: Date | string | null | undefined,
  timezone: string = 'UTC',
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return 'Invalid Date';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
    ...options,
  };

  return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
}

/**
 * Format a date as a short date string (without time)
 */
export function formatShortDate(
  date: Date | string | null | undefined,
  timezone: string = 'UTC'
): string {
  return formatDateWithTimezone(date, timezone, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: undefined,
    minute: undefined,
  });
}

/**
 * Format a date as a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(
  date: Date | string | null | undefined,
  timezone: string = 'UTC'
): string {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return 'Invalid Date';

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  
  return formatShortDate(dateObj, timezone);
}

/**
 * Format a date for input fields (YYYY-MM-DD format)
 */
export function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';

  return dateObj.toISOString().split('T')[0];
}

/**
 * Get current date/time in the system timezone
 */
export function getCurrentDateTime(timezone: string = 'UTC'): string {
  return formatDateWithTimezone(new Date(), timezone);
}
