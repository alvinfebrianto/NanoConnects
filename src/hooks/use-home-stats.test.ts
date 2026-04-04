import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("fetchHomeStats", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mengembalikan statistik beranda dari API cache edge", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          umkmCount: 1200,
          influencerCount: 5300,
          successfulCampaignCount: 10_450,
          satisfactionRate: 95,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )
    );

    const { fetchHomeStats } = await import("./use-home-stats");
    const result = await fetchHomeStats();

    expect(fetchSpy).toHaveBeenCalledWith("/stats-cache", { method: "GET" });
    expect(result).toEqual({
      umkmCount: 1200,
      influencerCount: 5300,
      successfulCampaignCount: 10_450,
      satisfactionRate: 95,
    });
  });

  it("melempar error saat endpoint stats-cache gagal", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("error", {
        status: 500,
        headers: { "content-type": "text/plain" },
      })
    );

    const { fetchHomeStats } = await import("./use-home-stats");

    await expect(fetchHomeStats()).rejects.toThrow(
      "Gagal memuat statistik beranda."
    );
  });
});
