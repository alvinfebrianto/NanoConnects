import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { calculateOrderPricing } from "@/lib/pricing";

afterEach(cleanup);

describe("calculateOrderPricing", () => {
  it("returns correct pricing for Rp 500.000 per post", () => {
    const result = calculateOrderPricing(500_000);

    expect(result.basePrice).toBe(500_000);
    expect(result.platformFee).toBe(50_000);
    expect(result.total).toBe(550_000);
  });

  it("returns correct pricing for Rp 350.000 per post", () => {
    const result = calculateOrderPricing(350_000);

    expect(result.basePrice).toBe(350_000);
    expect(result.platformFee).toBe(35_000);
    expect(result.total).toBe(385_000);
  });

  it("returns zero for all fields when price is 0", () => {
    const result = calculateOrderPricing(0);

    expect(result.basePrice).toBe(0);
    expect(result.platformFee).toBe(0);
    expect(result.total).toBe(0);
  });

  it("handles large price values correctly", () => {
    const result = calculateOrderPricing(10_000_000);

    expect(result.basePrice).toBe(10_000_000);
    expect(result.platformFee).toBe(1_000_000);
    expect(result.total).toBe(11_000_000);
  });
});
