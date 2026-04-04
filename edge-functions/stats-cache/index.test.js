import { describe, expect, it } from "vitest";
import { createStatsCacheHandler } from "./index";

const createRequest = (method = "GET") =>
  new Request("https://example.com/stats-cache", { method });

describe("stats-cache edge function", () => {
  it("mengembalikan data dari KV saat cache tersedia", async () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    const cachedPayload = {
      umkmCount: 10,
      influencerCount: 20,
      successfulCampaignCount: 30,
      satisfactionRate: 85,
      cachedAt: new Date(now - 1000).toISOString(),
      source: "cache",
    };

    const kv = {
      get: async () => cachedPayload,
      put: async () => undefined,
    };

    const fetchStatsFromSupabase = () => {
      throw new Error("tidak boleh memanggil supabase saat cache masih valid");
    };

    const onRequest = createStatsCacheHandler({
      now: () => now,
      fetchStatsFromSupabase,
      cacheTtlSeconds: 60,
    });

    const response = await onRequest({
      request: createRequest(),
      env: { stats: kv },
      params: {},
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual(cachedPayload);
  });

  it("mengambil dari Supabase lalu menyimpan ke KV saat cache kosong", async () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    const supabasePayload = {
      umkmCount: 50,
      influencerCount: 120,
      successfulCampaignCount: 80,
      satisfactionRate: 92,
    };
    let savedKey = "";
    let savedValue = null;

    const kv = {
      get: async () => null,
      put: (key, value) => {
        savedKey = key;
        savedValue = value;
      },
    };

    const onRequest = createStatsCacheHandler({
      now: () => now,
      fetchStatsFromSupabase: async () => supabasePayload,
      cacheTtlSeconds: 60,
    });

    const response = await onRequest({
      request: createRequest(),
      env: { stats: kv },
      params: {},
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ...supabasePayload,
      source: "supabase",
      cachedAt: new Date(now).toISOString(),
    });
    expect(savedKey).toBe("homepage-stats");
    expect(JSON.parse(savedValue)).toMatchObject({
      ...supabasePayload,
      cachedAt: new Date(now).toISOString(),
      source: "supabase",
    });
  });

  it("mengembalikan stale cache saat Supabase gagal", async () => {
    const now = Date.UTC(2026, 0, 1, 0, 10, 0);
    const stalePayload = {
      umkmCount: 5,
      influencerCount: 8,
      successfulCampaignCount: 3,
      satisfactionRate: 80,
      cachedAt: new Date(now - 120_000).toISOString(),
      source: "cache",
    };

    const kv = {
      get: async () => stalePayload,
      put: async () => undefined,
    };

    const onRequest = createStatsCacheHandler({
      now: () => now,
      fetchStatsFromSupabase: () => {
        throw new Error("supabase unavailable");
      },
      cacheTtlSeconds: 60,
    });

    const response = await onRequest({
      request: createRequest(),
      env: { stats: kv },
      params: {},
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ...stalePayload,
      source: "stale-cache",
    });
  });

  it("tetap mengembalikan data fresh saat penyimpanan KV gagal", async () => {
    const now = Date.UTC(2026, 0, 1, 0, 15, 0);
    const stalePayload = {
      umkmCount: 12,
      influencerCount: 18,
      successfulCampaignCount: 6,
      satisfactionRate: 81,
      cachedAt: new Date(now - 120_000).toISOString(),
      source: "cache",
    };
    const supabasePayload = {
      umkmCount: 99,
      influencerCount: 180,
      successfulCampaignCount: 45,
      satisfactionRate: 94,
    };

    const kv = {
      get: async () => stalePayload,
      put: () => {
        throw new Error("kv put gagal");
      },
    };

    const onRequest = createStatsCacheHandler({
      now: () => now,
      fetchStatsFromSupabase: async () => supabasePayload,
      cacheTtlSeconds: 60,
    });

    const response = await onRequest({
      request: createRequest(),
      env: { stats: kv },
      params: {},
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ...supabasePayload,
      cachedAt: new Date(now).toISOString(),
      source: "supabase",
    });
  });

  it("tetap mengembalikan data fresh saat pembacaan KV gagal", async () => {
    const now = Date.UTC(2026, 0, 1, 0, 20, 0);
    const supabasePayload = {
      umkmCount: 77,
      influencerCount: 150,
      successfulCampaignCount: 38,
      satisfactionRate: 91,
    };

    const kv = {
      get: () => {
        throw new Error("kv get gagal");
      },
      put: async () => undefined,
    };

    const onRequest = createStatsCacheHandler({
      now: () => now,
      fetchStatsFromSupabase: async () => supabasePayload,
      cacheTtlSeconds: 60,
    });

    const response = await onRequest({
      request: createRequest(),
      env: { stats: kv },
      params: {},
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ...supabasePayload,
      cachedAt: new Date(now).toISOString(),
      source: "supabase",
    });
  });
});
