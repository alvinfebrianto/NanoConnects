const STATS_CACHE_KEY = "homepage-stats";
const DEFAULT_CACHE_TTL_SECONDS = 300;
const DEFAULT_ERROR_MESSAGE = "Gagal memuat statistik beranda.";
const TRAILING_SLASH_REGEX = /\/$/;

const EMPTY_STATS = Object.freeze({
  umkmCount: 0,
  influencerCount: 0,
  successfulCampaignCount: 0,
  satisfactionRate: 0,
});

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const getSafeNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;

const isObject = (value) => typeof value === "object" && value !== null;

const normalizeStats = (value) => {
  if (!isObject(value)) {
    return EMPTY_STATS;
  }

  return {
    umkmCount: getSafeNumber(value.umkmCount ?? value.umkm_count),
    influencerCount: getSafeNumber(
      value.influencerCount ?? value.influencer_count
    ),
    successfulCampaignCount: getSafeNumber(
      value.successfulCampaignCount ?? value.successful_campaign_count
    ),
    satisfactionRate: getSafeNumber(
      value.satisfactionRate ?? value.satisfaction_rate
    ),
  };
};

const normalizeCacheEntry = (value) => {
  const parsedValue =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value);
          } catch {
            return null;
          }
        })()
      : value;

  if (!isObject(parsedValue) || typeof parsedValue.cachedAt !== "string") {
    return null;
  }

  const timestamp = Date.parse(parsedValue.cachedAt);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return {
    ...normalizeStats(parsedValue),
    cachedAt: parsedValue.cachedAt,
    source:
      typeof parsedValue.source === "string" ? parsedValue.source : "cache",
  };
};

const getCacheAgeMs = (entry, nowMs) => nowMs - Date.parse(entry.cachedAt);

const getCacheTtlSeconds = (ttl) => {
  const numericTtl = Number(ttl);
  if (Number.isFinite(numericTtl) && numericTtl > 0) {
    return Math.floor(numericTtl);
  }
  return DEFAULT_CACHE_TTL_SECONDS;
};

const getKvNamespace = (contextEnv) => contextEnv?.stats ?? globalThis.stats;

const fetchStatsFromSupabase = async (env) => {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseAnonKey = env.SUPABASE_ANON_KEY;

  if (!(supabaseUrl && supabaseAnonKey)) {
    throw new Error("Konfigurasi Supabase belum diatur.");
  }

  const rpcUrl = `${supabaseUrl.replace(TRAILING_SLASH_REGEX, "")}/rest/v1/rpc/get_homepage_stats`;
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "content-type": "application/json",
    },
    body: "{}",
  });

  if (!response.ok) {
    throw new Error(`Supabase RPC gagal (${response.status}).`);
  }

  const data = await response.json();
  const row = Array.isArray(data) ? data[0] : null;
  return normalizeStats(row);
};

export const createStatsCacheHandler = ({
  now = () => Date.now(),
  fetchStatsFromSupabase: fetchStats = fetchStatsFromSupabase,
  cacheTtlSeconds,
} = {}) =>
  async function onRequest(context) {
    const { request, env } = context;

    if (request.method !== "GET") {
      return jsonResponse({ message: "Metode tidak diizinkan." }, 405);
    }

    const kvNamespace = getKvNamespace(env);

    if (!kvNamespace) {
      return jsonResponse(
        { message: "Konfigurasi cache statistik tidak valid." },
        500
      );
    }

    const ttlSeconds = getCacheTtlSeconds(
      cacheTtlSeconds ?? env.STATS_CACHE_TTL_SECONDS
    );
    const nowMs = now();

    let cached = null;

    try {
      cached = normalizeCacheEntry(
        await kvNamespace.get(STATS_CACHE_KEY, { type: "json" })
      );
    } catch {
      // Kegagalan baca cache tidak boleh menghalangi fallback ke Supabase.
    }

    if (cached && getCacheAgeMs(cached, nowMs) < ttlSeconds * 1000) {
      return jsonResponse(cached);
    }

    try {
      const stats = await fetchStats(env);
      const payload = {
        ...stats,
        cachedAt: new Date(nowMs).toISOString(),
        source: "supabase",
      };

      try {
        await kvNamespace.put(STATS_CACHE_KEY, JSON.stringify(payload));
      } catch {
        // Gagal menyimpan cache tidak boleh menghalangi response data fresh.
      }
      return jsonResponse(payload);
    } catch {
      if (cached) {
        return jsonResponse({ ...cached, source: "stale-cache" });
      }

      return jsonResponse({ message: DEFAULT_ERROR_MESSAGE }, 500);
    }
  };

export const onRequest = createStatsCacheHandler();
