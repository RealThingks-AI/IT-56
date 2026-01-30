import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import { formatDateWithTimezone, formatShortDate, formatRelativeTime } from '@/lib/dateUtils';

interface FormattedDateProps {
  date: Date | string | null | undefined;
  format?: 'full' | 'short' | 'relative';
  options?: Intl.DateTimeFormatOptions;
}

/**
 * Component that formats dates using the system timezone setting
 */
export function FormattedDate({ date, format = 'full', options }: FormattedDateProps) {
  const { settings } = useSystemSettings();
  
  if (!date) return <>N/A</>;

  switch (format) {
    case 'short':
      return <>{formatShortDate(date, settings.timezone)}</>;
    case 'relative':
      return <>{formatRelativeTime(date, settings.timezone)}</>;
    default:
      return <>{formatDateWithTimezone(date, settings.timezone, options)}</>;
  }
}
