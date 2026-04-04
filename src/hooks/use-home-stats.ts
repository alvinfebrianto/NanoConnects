import { useQuery } from "@tanstack/react-query";

export interface HomeStats {
  umkmCount: number;
  influencerCount: number;
  successfulCampaignCount: number;
  satisfactionRate: number;
}

const getSafeNumber = (value: number | null | undefined): number =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;

const DEFAULT_HOME_STATS: HomeStats = {
  umkmCount: 0,
  influencerCount: 0,
  successfulCampaignCount: 0,
  satisfactionRate: 0,
};

const isObject = (
  value: unknown
): value is Record<string, number | null | undefined> =>
  typeof value === "object" && value !== null;

const toHomeStats = (value: unknown): HomeStats => {
  if (!isObject(value)) {
    return DEFAULT_HOME_STATS;
  }

  return {
    umkmCount: getSafeNumber(value.umkmCount),
    influencerCount: getSafeNumber(value.influencerCount),
    successfulCampaignCount: getSafeNumber(value.successfulCampaignCount),
    satisfactionRate: getSafeNumber(value.satisfactionRate),
  };
};

export async function fetchHomeStats(): Promise<HomeStats> {
  const response = await fetch("/stats-cache", { method: "GET" });
  if (!response.ok) {
    throw new Error("Gagal memuat statistik beranda.");
  }

  return toHomeStats(await response.json());
}

export function useHomeStats() {
  return useQuery({
    queryKey: ["home-stats"],
    queryFn: fetchHomeStats,
  });
}
