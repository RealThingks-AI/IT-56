import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/** Default navigation fallback for asset pages */
export const FALLBACK_NAV = "/assets/allassets";

/** Extract photo URL from asset custom_fields */
export const getPhotoUrl = (asset: any): string | null =>
  asset?.custom_fields?.photo_url || null;

/** Validate a URL starts with http:// or https:// */
export const isValidUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Shared keyboard shortcuts for asset action pages (checkout, checkin, dispose, reserve).
 * - Escape: navigate back (when no dialog is open)
 * - Enter: trigger confirm action (when not in input/textarea and action is available)
 */
export function useAssetPageShortcuts({
  canConfirm,
  dialogOpen,
  onConfirm,
  onEscape,
}: {
  canConfirm: boolean;
  dialogOpen: boolean;
  onConfirm: () => void;
  onEscape?: () => void;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !dialogOpen) {
        if (onEscape) onEscape();
        else navigate(FALLBACK_NAV);
        return;
      }
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (
        e.key === "Enter" &&
        !e.shiftKey &&
        canConfirm &&
        !dialogOpen &&
        activeTag !== "textarea" &&
        activeTag !== "input"
      ) {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canConfirm, dialogOpen, navigate, onConfirm, onEscape]);
}
