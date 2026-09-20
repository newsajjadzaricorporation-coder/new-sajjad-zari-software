import { LoyaltyTier, LoyaltyTierConfig, ShopSettings } from '../types';

export interface ExtendedLoyaltyTierConfig extends LoyaltyTierConfig {
  name?: string;
  maxPoints?: number;
  pointsMultiplier?: number;
}

export const LOYALTY_TIER_CONFIGS: Record<LoyaltyTier, ExtendedLoyaltyTierConfig> = {
  Bronze: {
    tier: 'Bronze',
    name: 'Bronze',
    minPoints: 0,
    maxPoints: 249,
    discountPercent: 0,
    pointMultiplier: 1.0,
    pointsMultiplier: 1.0,
    badgeColor: 'bg-amber-700/20 text-amber-300 border-amber-600/40',
    urduTitle: 'کانسی رکنیت (برونز)',
    perks: 'Earn 1 pt per Rs 100 spent',
  },
  Silver: {
    tier: 'Silver',
    name: 'Silver',
    minPoints: 250,
    maxPoints: 999,
    discountPercent: 2,
    pointMultiplier: 1.25,
    pointsMultiplier: 1.25,
    badgeColor: 'bg-slate-300/20 text-slate-200 border-slate-400/40',
    urduTitle: 'چاندی رکنیت (سلور)',
    perks: '2% instant discount + 1.25x Points accelerator',
  },
  Gold: {
    tier: 'Gold',
    name: 'Gold',
    minPoints: 1000,
    maxPoints: 2999,
    discountPercent: 5,
    pointMultiplier: 1.5,
    pointsMultiplier: 1.5,
    badgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/50',
    urduTitle: 'سونے کی رکنیت (گولڈ)',
    perks: '5% instant discount + 1.5x Points accelerator + Priority Support',
  },
  Platinum: {
    tier: 'Platinum',
    name: 'Platinum',
    minPoints: 3000,
    maxPoints: undefined,
    discountPercent: 8,
    pointMultiplier: 2.0,
    pointsMultiplier: 2.0,
    badgeColor: 'bg-purple-400/20 text-purple-300 border-purple-400/50',
    urduTitle: 'پلاٹینم شاہی رکنیت',
    perks: '8% VIP discount + 2.0x Double Points + Free Delivery/Priority',
  },
};

export const LOYALTY_TIERS = LOYALTY_TIER_CONFIGS;

/**
 * Derives the tier based on cumulative lifetime points
 */
export function getCustomerLoyaltyTier(lifetimePoints: number = 0): LoyaltyTier {
  if (lifetimePoints >= LOYALTY_TIER_CONFIGS.Platinum.minPoints) return 'Platinum';
  if (lifetimePoints >= LOYALTY_TIER_CONFIGS.Gold.minPoints) return 'Gold';
  if (lifetimePoints >= LOYALTY_TIER_CONFIGS.Silver.minPoints) return 'Silver';
  return 'Bronze';
}

/**
 * Calculates points earned on an invoice based on net/gross amount, customer tier, and shop settings
 */
export function calculatePointsEarned(
  amount: number,
  tier: LoyaltyTier = 'Bronze',
  settings?: ShopSettings
): number {
  if (settings?.loyaltyEnabled === false || amount <= 0) return 0;
  const rate = settings?.pointsPerHundredRupees ?? 1; // default: 1 point per 100 Rs
  const tierConfig = LOYALTY_TIER_CONFIGS[tier] || LOYALTY_TIER_CONFIGS.Bronze;
  const basePoints = Math.floor((amount / 100) * rate);
  const totalPoints = Math.floor(basePoints * (tierConfig.pointsMultiplier || tierConfig.pointMultiplier || 1));
  return totalPoints;
}

/**
 * Calculates the cash discount value for redeemed points
 */
export function calculatePointsDiscount(
  points: number,
  settings?: ShopSettings
): number {
  if (points <= 0) return 0;
  const rate = settings?.pointRedemptionRate ?? 1; // default: 1 point = 1 Rs
  return Math.round(points * rate);
}

/**
 * Maximum points redeemable based on customer balance and bill amount
 */
export function getMaxRedeemablePoints(
  customerPoints: number = 0,
  maxBillAmount: number = 0,
  settings?: ShopSettings
): number {
  const minRequired = settings?.minPointsToRedeem ?? 20;
  if (customerPoints < minRequired || maxBillAmount <= 0) return 0;
  const rate = settings?.pointRedemptionRate ?? 1;
  const pointsWorth = Math.floor(maxBillAmount / rate);
  return Math.min(customerPoints, pointsWorth);
}

/**
 * Multi-term fuzzy / partial matching algorithm for products
 * Searches through name, urduName, sku, barcode, notes, and category
 */
export function fuzzyProductMatch(
  query: string,
  target: {
    name?: string;
    urduName?: string;
    sku?: string;
    barcode?: string;
    category?: string;
    notes?: string;
  }
): boolean {
  if (!query || !query.trim()) return true;

  const cleanQuery = query.toLowerCase().trim();
  const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);

  const searchableFields = [
    target.name || '',
    target.urduName || '',
    target.sku || '',
    target.barcode || '',
    target.category || '',
    target.notes || '',
  ].map((f) => f.toLowerCase());

  const fullText = searchableFields.join(' ');

  // 1. Exact substring match in combined fields
  if (fullText.includes(cleanQuery)) return true;

  // 2. All tokens present match
  const allTokensMatch = queryTokens.every((token) => fullText.includes(token));
  if (allTokensMatch) return true;

  // 3. Subsequence fuzzy match for SKU / Barcode / Names (tolerant to typos)
  return queryTokens.every((token) => {
    return searchableFields.some((field) => isSubsequenceFuzzy(token, field));
  });
}

function isSubsequenceFuzzy(pattern: string, text: string): boolean {
  if (text.includes(pattern)) return true;
  if (pattern.length < 3) return false;

  let pIdx = 0;
  let tIdx = 0;
  let matches = 0;

  while (pIdx < pattern.length && tIdx < text.length) {
    if (pattern[pIdx] === text[tIdx]) {
      pIdx++;
      matches++;
    }
    tIdx++;
  }

  return matches >= pattern.length * 0.75;
}
