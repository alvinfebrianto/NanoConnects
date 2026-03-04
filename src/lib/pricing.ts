export const PLATFORM_FEE_RATE = 0.1;

export function calculateOrderPricing(pricePerPost: number) {
  const platformFee = Math.round(pricePerPost * PLATFORM_FEE_RATE);
  const total = pricePerPost + platformFee;
  return { basePrice: pricePerPost, platformFee, total };
}
