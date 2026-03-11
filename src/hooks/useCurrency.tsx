import { useMemo } from "react";
import { useUserPreferences } from "./useUserPreferences";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
  CHF: "CHF",
  CNY: "¥",
  SGD: "S$",
  AED: "د.إ",
};

const CURRENCY_LOCALES: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  JPY: "ja-JP",
  AUD: "en-AU",
  CAD: "en-CA",
  CHF: "de-CH",
  CNY: "zh-CN",
  SGD: "en-SG",
  AED: "ar-AE",
};

/**
 * Centralized currency hook — reads from user_preferences DB table.
 * Provides currency code, symbol, and a formatting function.
 */
export function useCurrency() {
  const { preferences } = useUserPreferences();
  const currency = preferences?.currency || "INR";

  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const locale = CURRENCY_LOCALES[currency] || "en-US";

  const formatCurrency = useMemo(
    () =>
      (value: number, overrideCurrency?: string) => {
        const code = overrideCurrency || currency;
        const loc = CURRENCY_LOCALES[code] || "en-US";
        const isWhole = Number.isInteger(value);
        return new Intl.NumberFormat(loc, {
          style: "currency",
          currency: code,
          minimumFractionDigits: isWhole ? 0 : 2,
          maximumFractionDigits: isWhole ? 0 : 2,
        }).format(value);
      },
    [currency]
  );

  return { currency, symbol, locale, formatCurrency };
}
