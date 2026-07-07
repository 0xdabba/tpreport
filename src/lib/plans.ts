export type PlanId = "TRIAL" | "STARTER" | "PROFESSIONAL" | "FIRM";

export type PlanLimits = {
  label: string;
  priceINR: number; // per year; 0 for trial
  maxClients: number; // Infinity for unlimited
  benchmarking: boolean;
  screener: boolean;
  proposals: boolean;
  portal: boolean; // white-label client portal
  maxSeats: number;
};

export const PLANS: Record<PlanId, PlanLimits> = {
  TRIAL: {
    label: "Free Trial",
    priceINR: 0,
    maxClients: 3,
    benchmarking: true,
    screener: true,
    proposals: true,
    portal: false,
    maxSeats: 3,
  },
  STARTER: {
    label: "Starter",
    priceINR: 24999,
    maxClients: 5,
    benchmarking: false,
    screener: false,
    proposals: false,
    portal: false,
    maxSeats: 3,
  },
  PROFESSIONAL: {
    label: "Professional",
    priceINR: 49999,
    maxClients: 25,
    benchmarking: true,
    screener: true,
    proposals: true,
    portal: false,
    maxSeats: 10,
  },
  FIRM: {
    label: "Firm",
    priceINR: 99999,
    maxClients: Infinity,
    benchmarking: true,
    screener: true,
    proposals: true,
    portal: true,
    maxSeats: Infinity,
  },
};

export const TRIAL_DAYS = 14;

export function getPlan(plan: string | null | undefined): PlanLimits {
  return PLANS[(plan as PlanId) || "TRIAL"] || PLANS.TRIAL;
}

export function planExpired(
  plan: string | null | undefined,
  planExpiresAt: Date | null | undefined
): boolean {
  if (!planExpiresAt) return false; // no expiry set — treat as active (e.g. seeded firms)
  return new Date() > new Date(planExpiresAt);
}

/**
 * Central gate. Returns an error string if blocked, null if allowed.
 */
export function gateFeature(
  firm: { plan: string; planExpiresAt: Date | null },
  feature: keyof Pick<
    PlanLimits,
    "benchmarking" | "screener" | "proposals" | "portal"
  >
): string | null {
  if (planExpired(firm.plan, firm.planExpiresAt)) {
    return "Your plan has expired. Renew from Settings → Billing to continue.";
  }
  const limits = getPlan(firm.plan);
  if (!limits[feature]) {
    return `The ${feature} module is not included in your ${limits.label} plan. Upgrade from Settings → Billing.`;
  }
  return null;
}

export function gateClientCount(
  firm: { plan: string; planExpiresAt: Date | null },
  currentCount: number
): string | null {
  if (planExpired(firm.plan, firm.planExpiresAt)) {
    return "Your plan has expired. Renew from Settings → Billing to continue.";
  }
  const limits = getPlan(firm.plan);
  if (currentCount >= limits.maxClients) {
    return `Your ${limits.label} plan allows up to ${limits.maxClients} clients. Upgrade from Settings → Billing to add more.`;
  }
  return null;
}
