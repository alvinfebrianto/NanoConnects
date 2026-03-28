import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

type HomeStatsRpcRow = Database["public"]["Functions"]["get_homepage_stats"]["Returns"][number];

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

export async function fetchHomeStats(): Promise<HomeStats> {
  const { data, error } = await supabase.rpc("get_homepage_stats");

  if (error) {
    throw new Error("Gagal memuat statistik beranda.");
  }

  const row = Array.isArray(data)
    ? (data[0] as HomeStatsRpcRow | undefined)
    : undefined;
  if (!row) {
    return DEFAULT_HOME_STATS;
  }

  return {
    umkmCount: getSafeNumber(row.umkm_count),
    influencerCount: getSafeNumber(row.influencer_count),
    successfulCampaignCount: getSafeNumber(row.successful_campaign_count),
    satisfactionRate: getSafeNumber(row.satisfaction_rate),
  };
}

export function useHomeStats() {
  return useQuery({
    queryKey: ["home-stats"],
    queryFn: fetchHomeStats,
  });
}
