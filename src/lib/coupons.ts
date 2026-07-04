export type DiscountType = 'percent' | 'flat';

export interface Coupon {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number; // percent (0-100) or flat amount in INR
  maxDiscount?: number; // cap for percent coupons
  minAmount?: number; // minimum cart value
  usageLimit?: number; // total redemptions allowed (0/undefined = unlimited)
  usedCount: number;
  perUserLimit?: number;
  active: boolean;
  expiresAt?: number; // epoch ms
  appliesToPlans?: string[]; // plan ids, empty = all
  createdAt: number;
}

export interface CouponValidation {
  valid: boolean;
  reason?: string;
  discount: number;
  finalAmount: number;
}

/**
 * Pure validation function. Server route is responsible for fetching the coupon,
 * per-user usage count, and persisting the redemption — this only computes.
 */
export function validateCoupon(
  coupon: Coupon | null,
  cartAmount: number,
  planId?: string,
  userUsedCount = 0
): CouponValidation {
  const base: CouponValidation = { valid: false, discount: 0, finalAmount: cartAmount };

  if (!coupon) return { ...base, reason: 'Coupon not found' };
  if (!coupon.active) return { ...base, reason: 'Coupon is inactive' };

  if (coupon.expiresAt && Date.now() > coupon.expiresAt) {
    return { ...base, reason: 'Coupon has expired' };
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return { ...base, reason: 'Coupon usage limit reached' };
  }
  if (coupon.perUserLimit && userUsedCount >= coupon.perUserLimit) {
    return { ...base, reason: 'You have already used this coupon' };
  }
  if (coupon.minAmount && cartAmount < coupon.minAmount) {
    return { ...base, reason: `Minimum order of ₹${coupon.minAmount} required` };
  }
  if (
    coupon.appliesToPlans &&
    coupon.appliesToPlans.length > 0 &&
    planId &&
    !coupon.appliesToPlans.includes(planId)
  ) {
    return { ...base, reason: 'Coupon not valid for this plan' };
  }

  let discount = 0;
  if (coupon.discountType === 'percent') {
    discount = (cartAmount * coupon.discountValue) / 100;
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  } else {
    discount = coupon.discountValue;
  }
  discount = Math.min(discount, cartAmount);
  discount = Math.round(discount * 100) / 100;

  return {
    valid: true,
    discount,
    finalAmount: Math.round((cartAmount - discount) * 100) / 100,
  };
}
