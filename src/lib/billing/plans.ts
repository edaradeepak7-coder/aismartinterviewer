/** Shared B2C plan catalog for Razorpay billing + /pricing page */

export interface BillingPlan {
  id: string;
  name: string;
  /** Monthly charge in INR */
  priceInr: number;
  /** Total yearly charge in INR (20% off vs 12 × monthly) */
  annualPriceInr: number;
  credits: number;
  /** Overage rate in paise per credit (0 = upgrade required) */
  overagePaise: number;
}

export const BILLING_PLANS: BillingPlan[] = [
  { id: 'free', name: 'Free', priceInr: 0, annualPriceInr: 0, credits: 30, overagePaise: 0 },
  { id: 'starter', name: 'Starter', priceInr: 499, annualPriceInr: 4790, credits: 100, overagePaise: 500 },
  { id: 'growth', name: 'Growth', priceInr: 1499, annualPriceInr: 14390, credits: 350, overagePaise: 400 },
  { id: 'pro', name: 'Pro', priceInr: 3499, annualPriceInr: 33590, credits: 1000, overagePaise: 300 },
];

export interface CreditAddon {
  name: string;
  /** Credits actually granted on purchase */
  credits: number;
  priceInr: number;
  /** Extra credits included in `credits` (for display) */
  bonusCredits?: number;
}

export const CREDIT_ADDONS: Record<string, CreditAddon> = {
  'addon-5': { name: '5 Session Credits', credits: 5, priceInr: 299 },
  'addon-15': { name: '15 Session Credits', credits: 17, priceInr: 699, bonusCredits: 2 },
  'addon-30': { name: '30 Session Credits', credits: 35, priceInr: 1299, bonusCredits: 5 },
  'addon-60': { name: '60 Session Credits', credits: 72, priceInr: 1999, bonusCredits: 12 },
  // Pricing page packs
  'addon-50': { name: '50 Credits', credits: 50, priceInr: 249 },
  'addon-150': { name: '150 Credits (+10 bonus)', credits: 160, priceInr: 599, bonusCredits: 10 },
  'addon-350': { name: '350 Credits (+30 bonus)', credits: 380, priceInr: 1199, bonusCredits: 30 },
  'addon-700': { name: '700 Credits (+80 bonus)', credits: 780, priceInr: 1999, bonusCredits: 80 },
};

/** Addon IDs shown on /pricing Credit Packs tab */
export const PRICING_PAGE_ADDON_IDS = ['addon-50', 'addon-150', 'addon-350', 'addon-700'] as const;

export function getBillingPlan(planId: string): BillingPlan | undefined {
  return BILLING_PLANS.find((p) => p.id === planId);
}

export function getPlanChargeInr(
  plan: BillingPlan,
  billingCycle: 'monthly' | 'annual' = 'monthly'
): number {
  return billingCycle === 'annual' ? plan.annualPriceInr : plan.priceInr;
}

/** Monthly-equivalent display when billed annually */
export function getAnnualMonthlyEquivalent(plan: BillingPlan): number {
  if (plan.annualPriceInr <= 0) return 0;
  return Math.round(plan.annualPriceInr / 12);
}

export function formatOverageRate(overagePaise: number): string {
  if (overagePaise <= 0) return 'Upgrade required';
  return `₹${(overagePaise / 100).toFixed(0)}/credit`;
}
