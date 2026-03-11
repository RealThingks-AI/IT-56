import { useEffect, useCallback } from "react";

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  callback: () => void;
  preventDefault?: boolean;
}

export const useKeyboardShortcuts = (shortcuts: ShortcutConfig[], enabled = true) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          // Allow "?" even in inputs if it's a help shortcut
          if (isInput && shortcut.key !== "?" && shortcut.key !== "Escape") {
            // Allow Ctrl+Enter in textareas
            if (!(shortcut.ctrl && shortcut.key === "Enter" && target.tagName === "TEXTAREA")) {
              continue;
            }
          }

          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.callback();
          break;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
};
