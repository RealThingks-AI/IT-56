// Shared subscription module constants, formatters, field rules, and query keys
import { convertToINR } from "@/lib/subscriptions/currencyConversion";
import { addMonths } from "date-fns";

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", AUD: "A$", CAD: "C$",
  SGD: "S$", AED: "د.إ", JPY: "¥", CNY: "¥",
};

export const CATEGORIES = ["Software", "Hardware", "Cloud Service", "Security", "Network", "Other"] as const;
export type SubscriptionCategory = typeof CATEGORIES[number];

export const SUBSCRIPTION_TYPES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
  { value: "owned", label: "Owned" },
  { value: "client", label: "Client Managed" },
  { value: "one_time", label: "One-Time" },
] as const;
export type SubscriptionType = typeof SUBSCRIPTION_TYPES[number]["value"];

export const STATUSES = [
  { value: "active", label: "Active" },
  { value: "expiring_soon", label: "Expiring Soon" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
  { value: "trial", label: "Trial" },
] as const;
export type SubscriptionStatus = typeof STATUSES[number]["value"];

/** Only these statuses should appear in form dropdowns; others are auto-computed */
export const USER_SELECTABLE_STATUSES = [
  { value: "active", label: "Active" },
  { value: "trial", label: "Trial" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const CURRENCIES = ["INR", "USD", "EUR"] as const;

const LICENSE_CATEGORIES = new Set<SubscriptionCategory>(["Software", "Cloud Service", "Security"]);
const RECURRING_TYPES = new Set<SubscriptionType>(["monthly", "quarterly", "annual"]);
const INTERNAL_BILLING_TYPES = new Set<SubscriptionType>(["monthly", "quarterly", "annual", "one_time"]);
const CONTRACT_TRACKED_TYPES = new Set<SubscriptionType>(["annual", "client"]);
const INACTIVE_STATUSES = new Set<SubscriptionStatus>(["expired", "cancelled"]);

export const SUB_QUERY_KEYS = {
  tools: ["subscriptions-tools"] as const,
  toolsDashboard: ["subscriptions-tools-dashboard"] as const,
  toolsActive: ["subscriptions-tools-active"] as const,
  toolsForFilter: ["subscriptions-tools-for-filter"] as const,
  licenses: ["subscriptions-licenses"] as const,
  licensesDashboard: ["subscriptions-licenses-dashboard"] as const,
  payments: ["subscriptions-payments"] as const,
  vendors: ["subscriptions-vendors"] as const,
  stats: ["subscription-stats"] as const,
  detail: (id: string) => ["subscription-detail", id] as const,
  detailLicenses: (id: string) => ["subscription-licenses", id] as const,
  detailPayments: (id: string) => ["subscription-payments", id] as const,
} as const;

export const ALL_TOOL_QUERY_KEYS = [
  SUB_QUERY_KEYS.tools,
  SUB_QUERY_KEYS.toolsDashboard,
  SUB_QUERY_KEYS.toolsActive,
  SUB_QUERY_KEYS.toolsForFilter,
  SUB_QUERY_KEYS.stats,
];

const CURRENCY_LOCALES: Record<string, string> = {
  INR: "en-IN", USD: "en-US", EUR: "de-DE", GBP: "en-GB",
  AUD: "en-AU", CAD: "en-CA", SGD: "en-SG", AED: "ar-AE",
  JPY: "ja-JP", CNY: "zh-CN",
};

export const formatCost = (amount: number | null | undefined, currency?: string | null): string => {
  if (amount === null || amount === undefined) return "—";
  const code = currency || "INR";
  const locale = CURRENCY_LOCALES[code] || "en-US";
  const isWhole = Number.isInteger(amount);
  const minFrac = isWhole ? 0 : 2;
  const maxFrac = isWhole ? 0 : 2;
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: code, minimumFractionDigits: minFrac, maximumFractionDigits: maxFrac }).format(amount);
  } catch {
    const sym = CURRENCY_SYMBOLS[code] || code;
    return `${sym} ${amount.toLocaleString(locale, { minimumFractionDigits: minFrac, maximumFractionDigits: maxFrac })}`;
  }
};

export const formatCostShort = (amount: number, currency?: string | null): string => {
  const code = currency || "INR";
  const locale = CURRENCY_LOCALES[code] || "en-US";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: code, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  } catch {
    const sym = CURRENCY_SYMBOLS[code] || code;
    return `${sym} ${amount.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
};

export const getDaysUntilRenewal = (renewalDate: string | null): number | null => {
  if (!renewalDate) return null;
  return Math.ceil((new Date(renewalDate).getTime() - Date.now()) / 86400000);
};

/** Cycle-aware thresholds to avoid nonsensical alerts on short billing cycles */
export const getCycleThresholds = (subscriptionType?: string | null) => {
  const type = subscriptionType || "annual";
  if (type === "monthly") {
    return {
      expiringSoonDays: 5,
      alertOptions: [
        { value: 3, label: "3 days before" },
        { value: 5, label: "5 days before" },
        { value: 7, label: "7 days before" },
      ],
      defaultAlertDays: 7,
      urgency: { critical: 2, warning: 5, caution: 14 },
    };
  }
  if (type === "quarterly") {
    return {
      expiringSoonDays: 15,
      alertOptions: [
        { value: 7, label: "7 days before" },
        { value: 15, label: "15 days before" },
        { value: 30, label: "30 days before" },
      ],
      defaultAlertDays: 15,
      urgency: { critical: 7, warning: 15, caution: 30 },
    };
  }
  // annual, client, owned, one_time, or unknown
  return {
    expiringSoonDays: 30,
    alertOptions: [
      { value: 7, label: "7 days before" },
      { value: 15, label: "15 days before" },
      { value: 30, label: "30 days before" },
      { value: 60, label: "60 days before" },
      { value: 90, label: "90 days before" },
    ],
    defaultAlertDays: 30,
    urgency: { critical: 7, warning: 30, caution: 90 },
  };
};

export const getRenewalUrgency = (days: number, subscriptionType?: string | null): "critical" | "warning" | "caution" | "normal" => {
  const { urgency } = getCycleThresholds(subscriptionType);
  if (days < 0) return "critical";
  if (days <= urgency.critical) return "critical";
  if (days <= urgency.warning) return "warning";
  if (days <= urgency.caution) return "caution";
  return "normal";
};

export const getMonthlyEquivalent = (totalCost: number, subscriptionType?: string | null): number => {
  const type = subscriptionType || "monthly";
  if (type === "annual") return totalCost / 12;
  if (type === "quarterly") return totalCost / 3;
  if (type === "monthly") return totalCost;
  // owned, one_time, client — not monthly recurring
  return 0;
};

/** Convert total_cost to INR first, then compute monthly equivalent. Use for all aggregate stats. */
export const getMonthlyEquivalentINR = (
  totalCost: number,
  currency?: string | null,
  subscriptionType?: string | null,
): number => {
  const inrAmount = convertToINR(totalCost, currency || "INR");
  return getMonthlyEquivalent(inrAmount, subscriptionType);
};

/** Compute annual cost contribution in INR. For owned/one_time, only counts if purchased in current FY (Apr–Mar). Uses purchase_date preferring over created_at. */
export const getAnnualContributionINR = (
  totalCost: number,
  currency?: string | null,
  subscriptionType?: string | null,
  purchaseOrCreatedAt?: string | null,
): number => {
  const inr = convertToINR(totalCost, currency || "INR");
  const type = subscriptionType || "monthly";
  if (type === "monthly") return inr * 12;
  if (type === "quarterly") return inr * 4;
  if (type === "annual") return inr;
  // owned / one_time: count only if purchased in current FY
  if (type === "owned" || type === "one_time") {
    if (!purchaseOrCreatedAt) return 0;
    const now = new Date();
    const fyStart = new Date(now.getFullYear(), 3, 1); // April 1
    if (now < fyStart) fyStart.setFullYear(fyStart.getFullYear() - 1);
    return new Date(purchaseOrCreatedAt) >= fyStart ? inr : 0;
  }
  return 0; // client-managed — not our cost
};

export const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    active: "default", trial: "secondary", expired: "destructive",
    cancelled: "outline", expiring_soon: "secondary",
  };
  return map[status] || "default";
};

export const getPredominantCurrency = (tools: Array<{ currency?: string | null }>): string => {
  const counts = new Map<string, number>();
  tools.forEach(t => {
    const c = t.currency || "INR";
    counts.set(c, (counts.get(c) || 0) + 1);
  });
  let max = 0;
  let result = "INR";
  counts.forEach((count, currency) => {
    if (count > max) {
      max = count;
      result = currency;
    }
  });
  return result;
};

export const formatSubscriptionTypeLabel = (value?: string | null) => {
  if (!value) return "—";
  return SUBSCRIPTION_TYPES.find(type => type.value === value)?.label || value.replace(/_/g, " ");
};

export const getQuantityLabel = (category?: string | null): string => {
  if (["Software", "Cloud Service", "Security"].includes(category || "")) return "Licenses / Seats";
  return "Quantity";
};

export const getSubscriptionFieldRules = (
  category?: string | null,
  type?: string | null,
  status?: string | null,
) => {
  const typedCategory = category as SubscriptionCategory | undefined;
  const typedType = type as SubscriptionType | undefined;
  const typedStatus = status as SubscriptionStatus | undefined;

  const isConfigured = Boolean(typedCategory && typedType && typedStatus);
  const isRecurring = typedType ? RECURRING_TYPES.has(typedType) : false;
  const isOwned = typedType === "owned";
  const isOneTime = typedType === "one_time";
  const isClientManaged = typedType === "client";
  const isTrial = typedStatus === "trial";
  const isInactive = typedStatus ? INACTIVE_STATUSES.has(typedStatus) : false;
  const isExpired = typedStatus === "expired";
  const isCancelled = typedStatus === "cancelled";

  // Purchase date: always shown when configured
  const showPurchaseDate = isConfigured;
  // Renewal date: removed from form — auto-calculated from purchase_date + type
  const showRenewalDate = false;
  // Expired date: removed from form — auto-calculated
  const showExpiredDate = false;
  // Next payment is always auto-synced from renewal_date for all recurring types - no separate field needed
  const showNextPaymentDate = false;
  const showContractDates = isConfigured && !isTrial && !isInactive && CONTRACT_TRACKED_TYPES.has((typedType || "monthly") as SubscriptionType);
  const showPaymentTerms = isConfigured && !isTrial && !isClientManaged && INTERNAL_BILLING_TYPES.has((typedType || "monthly") as SubscriptionType);
  // Renewal settings (auto-renew, alert) always visible when form is configured
  const showRenewalSettings = isConfigured;
  const showContractNumber = isConfigured && !isInactive && (showContractDates || isClientManaged);

  return {
    isConfigured,
    isRecurring,
    isOwned,
    isOneTime,
    isClientManaged,
    isTrial,
    isInactive,
    isExpired,
    isCancelled,
    showPricingFields: isConfigured,
    showPurchaseDate,
    showRenewalDate,
    showExpiredDate,
    showNextPaymentDate,
    showContractDates,
    showPaymentTerms,
    showRenewalSettings,
    showContractNumber,
    showDatesSection: showPurchaseDate || showContractDates,
    showAssignmentSection: isConfigured,
    showSettingsSection: isConfigured,
    renewalDateLabel: isTrial ? "Trial End Date" : "Renewal / Next Payment",
    quantityLabel: getQuantityLabel(category),
  };
};

/** Smart date parser for import - handles dd/MM/yyyy, MM/dd/yyyy, ISO, Excel serial */
export const parseImportDate = (raw: string): string | null => {
  if (!raw || raw.trim() === "") return null;
  const s = raw.trim();

  if (/^\d{5}$/.test(s)) {
    const d = new Date((parseInt(s) - 25569) * 86400000);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }

  const slashMatch = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (slashMatch) {
    const [, a, b, year] = slashMatch;
    const day = parseInt(a);
    const month = parseInt(b);

    if (day > 12) {
      const d = new Date(parseInt(year), month - 1, day);
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    }

    if (month > 12) {
      const d = new Date(parseInt(year), day - 1, month);
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    }

    const d = new Date(parseInt(year), month - 1, day);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];

  return null;
};

/** Compute the effective status based on manual selection + renewal date.
 *  Used on form submit and for display hints. */
export const computeEffectiveStatus = (
  manualStatus: string,
  renewalDate?: string | null,
  subscriptionType?: string | null,
): string => {
  if (manualStatus === "cancelled") return "cancelled";
  if (!renewalDate) return manualStatus;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const renewal = new Date(renewalDate);
  renewal.setHours(0, 0, 0, 0);

  if (isNaN(renewal.getTime())) return manualStatus;

  const diffDays = Math.ceil((renewal.getTime() - now.getTime()) / 86400000);
  const { expiringSoonDays } = getCycleThresholds(subscriptionType);

  if (diffDays < 0) return "expired";
  if (diffDays <= expiringSoonDays && (manualStatus === "active" || manualStatus === "trial")) return "expiring_soon";
  return manualStatus;
};

/** Compute the next renewal/payment date from purchase date + subscription type.
 *  Returns ISO date string (YYYY-MM-DD) or null for non-recurring types. */
export const computeRenewalDate = (
  purchaseDate: string | null | undefined,
  subscriptionType: string | null | undefined,
): string | null => {
  if (!purchaseDate) return null;
  const type = subscriptionType || "monthly";
  const base = new Date(purchaseDate);
  if (isNaN(base.getTime())) return null;

  let step: number;
  if (type === "monthly") step = 1;
  else if (type === "quarterly") step = 3;
  else if (type === "annual") step = 12;
  else return null; // owned, one_time, client — no auto-renewal

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let next = addMonths(base, step);
  // Roll forward until renewal is in the future (or today)
  while (next < today) {
    next = addMonths(next, step);
  }
  return next.toISOString().split("T")[0];
};