import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitize user input for use in Supabase `.ilike()` / `.or()` filter strings.
 * Escapes special Postgres LIKE/filter characters that could break queries.
 */
export function sanitizeSearchInput(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/,/g, "\\,");
}
