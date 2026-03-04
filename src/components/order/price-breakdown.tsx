import { calculateOrderPricing } from "@/lib/pricing";

interface PriceBreakdownProps {
  basePrice: number;
}

export function PriceBreakdown({ basePrice }: PriceBreakdownProps) {
  const { platformFee, total: totalPrice } = calculateOrderPricing(basePrice);

  return (
    <div className="space-y-3 rounded-xl bg-zinc-50 p-6 dark:bg-zinc-800">
      <div className="flex items-center justify-between">
        <span className="text-zinc-600 dark:text-zinc-400">Biaya Layanan</span>
        <span className="font-medium dark:text-zinc-200">
          Rp {basePrice.toLocaleString("id-ID")}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-zinc-600 dark:text-zinc-400">
          Biaya Platform (10%)
        </span>
        <span className="font-medium dark:text-zinc-200">
          Rp {platformFee.toLocaleString("id-ID")}
        </span>
      </div>
      <div className="flex items-center justify-between border-zinc-200 border-t pt-3 dark:border-zinc-700">
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">
          Total
        </span>
        <span className="font-bold font-display text-2xl text-primary-600">
          Rp {totalPrice.toLocaleString("id-ID")}
        </span>
      </div>
    </div>
  );
}
