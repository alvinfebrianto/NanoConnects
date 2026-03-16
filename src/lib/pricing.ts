import { PLATFORM_FEE_RATE } from "./constants";

export function calculateOrderPricing(pricePerPost: number) {
  const platformFee = Math.round(pricePerPost * PLATFORM_FEE_RATE);
  const total = pricePerPost + platformFee;
  return { basePrice: pricePerPost, platformFee, total };
}
