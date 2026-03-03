import { useCallback, useEffect, useState } from "react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

function useCountUp(end: number, isActive: boolean, duration = 1800) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let startTime: number | null = null;
    let rafId: number;

    const step = (timestamp: number) => {
      if (!startTime) {
        startTime = timestamp;
      }
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setCount(Math.floor(eased * end));
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [end, isActive, duration]);

  return count;
}

function StatCard({
  value,
  suffix,
  label,
  isVisible,
  delay,
}: {
  value: number;
  suffix: string;
  label: string;
  isVisible: boolean;
  delay: number;
}) {
  const count = useCountUp(value, isVisible);
  const formatValue = useCallback(
    (n: number) => {
      if (suffix === "K+") {
        return `${n}K+`;
      }
      if (suffix === "%") {
        return `${n}%`;
      }
      if (suffix === "K") {
        return `Rp ${n}K`;
      }
      if (suffix === "+") {
        return `${n}+`;
      }
      return `${n}`;
    },
    [suffix]
  );

  return (
    <div
      className={`flex flex-col items-center transition-all duration-500 ${
        isVisible ? "scroll-visible" : "scroll-hidden"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <dd className="order-first font-bold font-display text-4xl text-zinc-900 tracking-tight sm:text-5xl dark:text-white">
        {isVisible ? formatValue(count) : formatValue(0)}
      </dd>
      <dt className="mt-2 text-center font-medium text-sm text-zinc-600 leading-5 dark:text-zinc-400">
        {label}
      </dt>
    </div>
  );
}

const STATS = [
  { value: 1000, suffix: "+", label: "UMKM Bergabung" },
  { value: 5000, suffix: "+", label: "Nano Influencer" },
  { value: 10, suffix: "K+", label: "Campaign Sukses" },
  { value: 95, suffix: "%", label: "Tingkat Kepuasan" },
];

export function StatsTicker() {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section className="bg-[#F9F8E8] py-16 sm:py-20 dark:bg-zinc-900" ref={ref}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <dl className="grid grid-cols-2 gap-8 sm:gap-12 lg:grid-cols-4">
          {STATS.map((stat, i) => (
            <StatCard
              delay={i * 150}
              isVisible={isVisible}
              key={stat.label}
              label={stat.label}
              suffix={stat.suffix}
              value={stat.value}
            />
          ))}
        </dl>
      </div>
    </section>
  );
}
