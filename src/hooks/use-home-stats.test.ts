import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe("fetchHomeStats", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mengembalikan statistik beranda dari fungsi RPC Supabase", async () => {
    const { supabase } = await import("@/lib/supabase");

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [
        {
          umkm_count: 1200,
          influencer_count: 5300,
          successful_campaign_count: 10_450,
          satisfaction_rate: 95,
        },
      ],
      error: null,
    } as never);

    const { fetchHomeStats } = await import("./use-home-stats");
    const result = await fetchHomeStats();

    expect(supabase.rpc).toHaveBeenCalledWith("get_homepage_stats");
    expect(result).toEqual({
      umkmCount: 1200,
      influencerCount: 5300,
      successfulCampaignCount: 10_450,
      satisfactionRate: 95,
    });
  });

  it("melempar error saat fungsi RPC gagal", async () => {
    const { supabase } = await import("@/lib/supabase");

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: "forbidden" },
    } as never);

    const { fetchHomeStats } = await import("./use-home-stats");

    await expect(fetchHomeStats()).rejects.toThrow(
      "Gagal memuat statistik beranda."
    );
  });
});
