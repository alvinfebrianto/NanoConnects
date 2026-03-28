import { useCallback, useEffect, useState } from "react";
import { useHomeStats } from "@/hooks/use-home-stats";
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
  suffix: "+" | "K+" | "%" | "K";
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

export function StatsTicker() {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();
  const { data } = useHomeStats();

  const successfulCampaignCount = data?.successfulCampaignCount ?? 0;
  const campaignStat =
    successfulCampaignCount >= 1000
      ? {
          value: Math.floor(successfulCampaignCount / 1000),
          suffix: "K+" as const,
        }
      : { value: successfulCampaignCount, suffix: "+" as const };

  const stats = [
    {
      value: data?.umkmCount ?? 0,
      suffix: "+" as const,
      label: "UMKM Bergabung",
    },
    {
      value: data?.influencerCount ?? 0,
      suffix: "+" as const,
      label: "Nano Influencer",
    },
    {
      value: campaignStat.value,
      suffix: campaignStat.suffix,
      label: "Campaign Sukses",
    },
    {
      value: data?.satisfactionRate ?? 0,
      suffix: "%" as const,
      label: "Tingkat Kepuasan",
    },
  ];

  return (
    <section className="bg-[#F9F8E8] py-16 sm:py-20 dark:bg-zinc-900" ref={ref}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <dl className="grid grid-cols-2 gap-8 sm:gap-12 lg:grid-cols-4">
          {stats.map((stat, i) => (
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
