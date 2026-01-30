// Currency conversion utility for subscriptions
// All exchange rates are approximate and should be updated regularly

const EXCHANGE_RATES_TO_INR: Record<string, number> = {
  INR: 1,
  USD: 83.0,
  EUR: 90.0,
  GBP: 105.0,
  AUD: 55.0,
  CAD: 62.0,
  SGD: 62.0,
  AED: 22.6,
  JPY: 0.56,
  CNY: 11.5,
};

/**
 * Converts an amount from any supported currency to INR
 * @param amount - The amount to convert
 * @param fromCurrency - The source currency code (defaults to INR)
 * @returns The amount in INR
 */
export const convertToINR = (amount: number, fromCurrency: string = "INR"): number => {
  if (!amount) return 0;
  
  const currency = fromCurrency?.toUpperCase() || "INR";
  const rate = EXCHANGE_RATES_TO_INR[currency] || EXCHANGE_RATES_TO_INR["INR"];
  
  return amount * rate;
};

/**
 * Formats an amount in INR with proper locale formatting
 * @param amount - The amount in INR
 * @returns Formatted string with ₹ symbol
 */
export const formatINR = (amount: number): string => {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};
