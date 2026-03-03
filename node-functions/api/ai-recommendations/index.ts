import { createError } from "evlog";
import type { Influencer } from "../../../src/types";
import { createNodeFunctionLogger, emitAndReturn } from "../../lib/evlog";
import { createInMemoryRateLimiter } from "../../lib/rate-limiter";
import { createSupabaseClient } from "../../lib/supabase-client";
import {
  attachPublicUserProfiles,
  PRIVATE_USER_PROFILE_SELECT,
  type PrivateUserProfile,
  PUBLIC_USER_PROFILE_SELECT,
  PUBLIC_USER_PROFILE_VIEW,
  sanitizeInfluencersForPublic,
} from "../../lib/user-profiles";
import { getAiConfig } from "./ai-config";
import type { RecommendationOutput } from "./ai-recommendation-schema";
import {
  type AiRecommendationService,
  type CampaignPayload,
  createAiRecommendationService,
} from "./ai-recommendation-service";

const aiRateLimiter = createInMemoryRateLimiter();
const USER_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 6,
};
const IP_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 20,
};

interface AiRecommendationsDependencies {
  getAuthUser: () => Promise<{ id: string } | null>;
  getUserProfile: (userId: string) => Promise<PrivateUserProfile | null>;
  getAvailableInfluencers: () => Promise<Influencer[]>;
  consumeRateLimit: (payload: { userId: string; ipAddress: string }) => {
    allowed: boolean;
    retryAfterSeconds: number;
  };
  getAiService: () => AiRecommendationService;
}

type AiRecommendationsDependenciesFactory = (
  accessToken: string
) => AiRecommendationsDependencies;

const createAiRecommendationsDependencies: AiRecommendationsDependenciesFactory =
  (accessToken) => {
    const supabase = createSupabaseClient(accessToken);

    return {
      async getAuthUser() {
        const { data, error } = await supabase.auth.getUser(accessToken);
        if (error || !data.user) {
          return null;
        }
        return data.user;
      },

      async getUserProfile(userId: string) {
        const { data, error } = await supabase
          .from("users")
          .select(PRIVATE_USER_PROFILE_SELECT)
          .eq("id", userId)
          .single();

        if (error?.code === "PGRST116") {
          return null;
        }

        if (error) {
          throw error;
        }

        return data as PrivateUserProfile;
      },

      async getAvailableInfluencers() {
        const { data, error } = await supabase
          .from("influencers")
          .select("*")
          .eq("is_available", true)
          .eq("verification_status", "verified")
          .order("followers_count", { ascending: false })
          .limit(20);

        if (error) {
          throw error;
        }

        const influencers = (data as Influencer[]) ?? [];
        if (influencers.length === 0) {
          return [];
        }

        const userIds = [...new Set(influencers.map((item) => item.user_id))];
        const { data: userProfiles, error: userProfilesError } = await supabase
          .from(PUBLIC_USER_PROFILE_VIEW)
          .select(PUBLIC_USER_PROFILE_SELECT)
          .in("id", userIds);

        if (userProfilesError) {
          throw userProfilesError;
        }

        return attachPublicUserProfiles(influencers, userProfiles ?? []);
      },

      consumeRateLimit({ userId, ipAddress }) {
        const userResult = aiRateLimiter.consume(
          `ai-recommendations:user:${userId}`,
          USER_RATE_LIMIT
        );
        if (!userResult.allowed) {
          return userResult;
        }

        const ipResult = aiRateLimiter.consume(
          `ai-recommendations:ip:${ipAddress}`,
          IP_RATE_LIMIT
        );
        return ipResult;
      },

      getAiService() {
        const config = getAiConfig();
        return createAiRecommendationService(config);
      },
    };
  };

const jsonResponse = (
  body: unknown,
  status = 200,
  extraHeaders: HeadersInit = {}
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...extraHeaders },
  });

const getClientIp = (request: Request): string => {
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) {
    return xRealIp.trim();
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstForwardedIp = forwardedFor.split(",")[0];
    return firstForwardedIp?.trim() || "unknown";
  }

  return "unknown";
};

const parsePayload = async (request: Request) => {
  try {
    return (await request.json()) as Partial<CampaignPayload>;
  } catch {
    return null;
  }
};

const validatePayload = (payload: ReturnType<typeof parsePayload>) => {
  if (!payload) {
    return "Payload tidak valid.";
  }

  const requiredFields: (keyof CampaignPayload)[] = [
    "niche",
    "company_size",
    "budget",
    "target_audience",
    "location",
    "campaign_type",
  ];

  for (const field of requiredFields) {
    const value = payload[field];
    if (value === undefined || value === null || value === "") {
      return "Lengkapi seluruh data kampanye.";
    }
  }

  if (typeof payload.niche !== "string") {
    return "Niche tidak valid.";
  }

  if (typeof payload.company_size !== "string") {
    return "Ukuran bisnis tidak valid.";
  }

  if (typeof payload.target_audience !== "string") {
    return "Target audiens tidak valid.";
  }

  if (typeof payload.location !== "string") {
    return "Lokasi tidak valid.";
  }

  if (typeof payload.campaign_type !== "string") {
    return "Jenis kampanye tidak valid.";
  }

  if (typeof payload.budget !== "number" || Number.isNaN(payload.budget)) {
    return "Budget harus berupa angka.";
  }

  if (payload.budget <= 0) {
    return "Budget harus lebih besar dari 0.";
  }

  return null;
};

const parseBearerToken = (
  authorizationHeader: string | null
): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

const formatErrorResponse = (
  error: unknown,
  log: ReturnType<typeof createNodeFunctionLogger>
): Response => {
  const structuredError = createError({
    message: "Gagal membuat rekomendasi AI.",
    status: 500,
    why: error instanceof Error ? error.message : "Unknown internal error.",
    fix: "Coba lagi beberapa saat lagi.",
    cause: error instanceof Error ? error : undefined,
  });

  log.error(structuredError, { action: "generate-ai-recommendations" });

  const errorMessage =
    error instanceof Error ? error.message : "Terjadi kesalahan.";

  if (
    errorMessage.includes("rate limit") ||
    errorMessage.includes("Rate limit")
  ) {
    return jsonResponse(
      { message: "Terlalu banyak permintaan. Silakan coba lagi nanti." },
      429
    );
  }

  if (
    errorMessage.includes("API key") ||
    errorMessage.includes("Provider AI")
  ) {
    return jsonResponse(
      { message: "Konfigurasi AI tidak valid. Hubungi administrator." },
      500
    );
  }

  if (
    errorMessage.includes("provider") ||
    errorMessage.includes("gateway") ||
    errorMessage.includes("timeout")
  ) {
    return jsonResponse(
      { message: "Layanan AI sedang gangguan. Silakan coba lagi nanti." },
      503
    );
  }

  return jsonResponse(
    {
      message: `Gagal membuat rekomendasi AI: ${errorMessage}`,
    },
    500
  );
};

interface EnrichedRecommendation {
  influencerId: string;
  matchScore: number;
  reasons: string[];
  contentStrategy: string;
  influencer: Influencer;
}

const enrichRecommendationsWithInfluencers = (
  aiResult: RecommendationOutput,
  influencers: Influencer[]
): EnrichedRecommendation[] => {
  const influencerMap = new Map(influencers.map((inf) => [inf.id, inf]));

  return aiResult.recommendations
    .map((rec) => {
      const influencer = influencerMap.get(rec.influencerId);
      if (!influencer) {
        return null;
      }

      return {
        ...rec,
        influencer,
      };
    })
    .filter((item): item is EnrichedRecommendation => item !== null);
};

const processRecommendationRequest = async (
  request: Request,
  dependencies: AiRecommendationsDependencies
): Promise<Response> => {
  const authUser = await dependencies.getAuthUser();
  if (!authUser) {
    return jsonResponse({ message: "Autentikasi tidak valid." }, 401);
  }

  const rateLimit = dependencies.consumeRateLimit({
    userId: authUser.id,
    ipAddress: getClientIp(request),
  });
  if (!rateLimit.allowed) {
    return jsonResponse(
      { message: "Terlalu banyak permintaan. Silakan coba lagi nanti." },
      429,
      { "Retry-After": String(rateLimit.retryAfterSeconds) }
    );
  }

  const payload = await parsePayload(request);
  const validationError = validatePayload(payload);
  if (validationError) {
    return jsonResponse({ message: validationError }, 400);
  }

  const userProfile = await dependencies.getUserProfile(authUser.id);
  if (!userProfile) {
    return jsonResponse({ message: "Profil pengguna tidak ditemukan." }, 404);
  }

  if (userProfile.user_type !== "sme") {
    return jsonResponse(
      { message: "Hanya akun SME yang dapat meminta rekomendasi." },
      403
    );
  }

  const [influencersResult, aiService] = await Promise.all([
    dependencies.getAvailableInfluencers(),
    Promise.resolve(dependencies.getAiService()),
  ]);
  const influencers = sanitizeInfluencersForPublic(influencersResult);

  if (influencers.length === 0) {
    return jsonResponse({
      message: "Data kampanye diterima.",
      data: {
        user: {
          id: userProfile.id,
          name: userProfile.name,
          email: userProfile.email,
        },
        summary:
          "Saat ini tidak ada influencer yang tersedia untuk direkomendasikan.",
        recommendations: [],
      },
    });
  }

  const aiResult = await aiService.generateRecommendations(
    payload as CampaignPayload,
    influencers
  );

  const enrichedRecommendations = enrichRecommendationsWithInfluencers(
    aiResult,
    influencers
  );

  return jsonResponse({
    message: "Rekomendasi AI berhasil dibuat.",
    data: {
      user: {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
      },
      summary: aiResult.summary,
      recommendations: enrichedRecommendations,
    },
  });
};

export const createAiRecommendationsHandler = (
  dependenciesFactory: AiRecommendationsDependenciesFactory = createAiRecommendationsDependencies
) =>
  async function onRequest(context: { request: Request }) {
    const { request } = context;
    const log = createNodeFunctionLogger(request);
    let response: Response;

    if (request.method !== "POST") {
      response = jsonResponse({ message: "Metode tidak diizinkan." }, 405);
      return emitAndReturn(log, response);
    }

    const accessToken = parseBearerToken(request.headers.get("Authorization"));
    if (!accessToken) {
      response = jsonResponse({ message: "Autentikasi diperlukan." }, 401);
      return emitAndReturn(log, response);
    }

    const dependencies = dependenciesFactory(accessToken);

    try {
      response = await processRecommendationRequest(request, dependencies);
      if (response.status === 200) {
        log.set({ action: "generate-ai-recommendations" });
      }
      return emitAndReturn(log, response);
    } catch (error) {
      response = formatErrorResponse(error, log);
      return emitAndReturn(log, response);
    }
  };

export const onRequest = createAiRecommendationsHandler();
