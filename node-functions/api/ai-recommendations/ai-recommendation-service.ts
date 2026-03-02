import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  extractJsonMiddleware,
  generateText,
  NoObjectGeneratedError,
  Output,
  wrapLanguageModel,
} from "ai";
import type { Influencer } from "../../../src/types";
import type { AiConfig } from "./ai-config";
import {
  type RecommendationOutput,
  recommendationSchema,
} from "./ai-recommendation-schema";
import { type ApiKeyRotator, createApiKeyRotator } from "./api-key-rotator";

export interface AiRecommendationService {
  generateRecommendations: (
    campaign: CampaignPayload,
    influencers: Influencer[]
  ) => Promise<RecommendationOutput>;
}

export interface CampaignPayload {
  niche: string;
  company_size: string;
  budget: number;
  target_audience: string;
  location: string;
  campaign_type: string;
}

export type GenerateTextFn = (options: {
  model: unknown;
  system: string;
  prompt: string;
  output: unknown;
}) => Promise<{ output: unknown }>;

interface AiServiceDependencies {
  generateText: GenerateTextFn;
  createProvider: (apiKey: string) => { model: (id: string) => unknown };
}

type UnknownRecord = Record<string, unknown>;

const FALLBACK_SUMMARY_PREFIX =
  "Rekomendasi disusun dari analisis data influencer karena respons AI tidak konsisten.";

function buildSystemPrompt(): string {
  return `Kamu adalah AI Marketing Expert untuk platform NanoConnect yang menghubungkan UMKM (SME) dengan nano-influencer di Indonesia.

TUGAS: Analisis kebutuhan kampanye dan berikan rekomendasi influencer yang paling cocok.

KRITERIA PENILAIAN:
- Kesesuaian niche dengan jenis produk/layanan
- Kesesuaian lokasi dengan target pasar
- Budget yang tersedia vs harga influencer
- Engagement rate (lebih tinggi lebih baik)
- Relevansi audiens influencer dengan target kampanye

INSTRUKSI:
1. Pilih 3-5 influencer terbaik yang cocok untuk kampanye ini
2. Berikan matchScore (0-100) untuk setiap influencer
3. Jelaskan alasan pemilihan (minimal 1 alasan)
4. Sarankan strategi konten spesifik
5. Berikan ringkasan kampanye dalam Bahasa Indonesia`;
}

function buildInfluencerList(influencers: Influencer[]): string {
  return influencers
    .map((inf, index) => {
      const userName = inf.user?.name ?? "Unknown";
      return `${index + 1}. ${userName}
   - ID: ${inf.id}
   - Niche: ${inf.niche}
   - Lokasi: ${inf.location}
   - Followers: ${inf.followers_count.toLocaleString("id-ID")}
   - Engagement Rate: ${inf.engagement_rate}%
   - Harga per Post: Rp ${inf.price_per_post.toLocaleString("id-ID")}
   - Kategori Konten: ${inf.content_categories?.join(", ") ?? "N/A"}
   - Bahasa: ${inf.languages?.join(", ") ?? "N/A"}
   - Tersedia: ${inf.is_available ? "Ya" : "Tidak"}`;
    })
    .join("\n\n");
}

function buildUserPrompt(
  campaign: CampaignPayload,
  influencers: Influencer[]
): string {
  return `DATA KAMPANYE:
- Niche/Industri: ${campaign.niche}
- Ukuran Perusahaan: ${campaign.company_size}
- Budget Total: Rp ${campaign.budget.toLocaleString("id-ID")}
- Target Audiens: ${campaign.target_audience}
- Lokasi Target: ${campaign.location}
- Jenis Kampanye: ${campaign.campaign_type}

DAFTAR INFLUENCER YANG TERSEDIA:
${buildInfluencerList(influencers)}

Pilih influencer terbaik untuk kampanye ini.`;
}

function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const httpError = error as unknown as Record<string, unknown>;
    if (httpError.status === 429) {
      return true;
    }
    if (error.message.toLowerCase().includes("rate limit")) {
      return true;
    }
    if (error.message.toLowerCase().includes("too many requests")) {
      return true;
    }
  }
  return false;
}

function isProviderError(error: unknown): boolean {
  if (error instanceof Error) {
    const httpError = error as unknown as Record<string, unknown>;

    const data = httpError.data as Record<string, unknown> | undefined;
    const statusCode = httpError.statusCode ?? httpError.status ?? data?.code;

    if (typeof statusCode === "number") {
      if (statusCode >= 500 && statusCode < 600) {
        return true;
      }
      if (statusCode === 524) {
        return true;
      }
    }

    if (error.message.toLowerCase().includes("provider")) {
      return true;
    }
    if (error.message.toLowerCase().includes("gateway")) {
      return true;
    }
    if (error.message.toLowerCase().includes("timeout")) {
      return true;
    }
    if (error.message.toLowerCase().includes("internal server error")) {
      return true;
    }
  }
  return false;
}

function shouldRetryError(error: unknown): boolean {
  return (
    isRateLimitError(error) ||
    isProviderError(error) ||
    isRecommendationSchemaError(error)
  );
}

const RATE_LIMIT_ERROR_MSG =
  "Semua API key telah mencapai batas rate limit. Silakan coba lagi nanti.";

const PROVIDER_ERROR_MSG =
  "Provider AI mengalami gangguan. Silakan coba lagi nanti.";

const SCHEMA_ERROR_MSG =
  "Format output AI belum sesuai. Silakan coba lagi dalam beberapa saat.";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const calculateRetryDelay = (attempt: number): number => {
  const baseDelay = 1000 * 2 ** attempt;
  const jitter = Math.random() * 1000;
  return baseDelay + jitter;
};

const ensureRetryableError = (error: unknown): void => {
  if (!shouldRetryError(error)) {
    throw error;
  }
};

const updateConsecutiveProviderErrors = (
  error: unknown,
  consecutiveProviderErrors: number
): number => {
  if (!isProviderError(error)) {
    return 0;
  }

  const nextConsecutiveProviderErrors = consecutiveProviderErrors + 1;
  if (nextConsecutiveProviderErrors >= 3) {
    throw new Error(PROVIDER_ERROR_MSG);
  }
  return nextConsecutiveProviderErrors;
};

const throwRetryExhaustedError = (lastError: Error | null): never => {
  if (lastError && isRateLimitError(lastError)) {
    throw new Error(RATE_LIMIT_ERROR_MSG);
  }
  if (lastError && isProviderError(lastError)) {
    throw new Error(PROVIDER_ERROR_MSG);
  }
  if (lastError && isRecommendationSchemaError(lastError)) {
    throw new Error(SCHEMA_ERROR_MSG);
  }
  throw new Error("Gagal membuat rekomendasi setelah mencoba semua API key.");
};

const defaultDependencies: AiServiceDependencies = {
  generateText: (options) =>
    generateText(options as Parameters<typeof generateText>[0]) as Promise<{
      output: unknown;
    }>,
  createProvider: (apiKey: string) => {
    const openrouter = createOpenRouter({ apiKey });
    return {
      model: (id: string) =>
        wrapLanguageModel({
          model: openrouter(id, {
            plugins: [{ id: "response-healing" }],
          }),
          middleware: extractJsonMiddleware(),
        }),
    };
  },
};

class RecommendationSchemaError extends Error {
  constructor() {
    super("Output AI tidak valid terhadap schema rekomendasi.");
    this.name = "RecommendationSchemaError";
  }
}

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null;

const pickValue = (
  source: UnknownRecord,
  keys: readonly string[]
): unknown | undefined => {
  for (const key of keys) {
    const candidate = source[key];
    if (candidate !== undefined) {
      return candidate;
    }
  }
  return undefined;
};

const getFirstJsonCandidate = (text: string): string | null => {
  const firstBraceIndex = text.indexOf("{");
  const firstBracketIndex = text.indexOf("[");

  if (firstBraceIndex === -1 && firstBracketIndex === -1) {
    return null;
  }

  const startIndex =
    firstBraceIndex === -1
      ? firstBracketIndex
      : firstBracketIndex === -1
        ? firstBraceIndex
        : Math.min(firstBraceIndex, firstBracketIndex);
  const openingChar = text[startIndex];
  const closingChar = openingChar === "{" ? "}" : "]";

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = startIndex; index < text.length; index++) {
    const character = text[index];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (character === "\\") {
      isEscaped = true;
      continue;
    }

    if (character === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (character === openingChar) {
      depth += 1;
      continue;
    }

    if (character === closingChar) {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  return null;
};

const tryParseLooseJson = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const candidate = getFirstJsonCandidate(trimmed);
    if (!candidate) {
      return value;
    }

    try {
      return JSON.parse(candidate);
    } catch {
      return value;
    }
  }
};

const normalizeRecommendationItem = (value: unknown): unknown => {
  if (!isRecord(value)) {
    return value;
  }

  const nestedInfluencer = isRecord(value.influencer) ? value.influencer : null;
  const influencerIdRaw = pickValue(value, [
    "influencerId",
    "influencer_id",
    "influencerID",
    "influencer",
    "id",
    "influencer_id_str",
  ]);
  const matchScoreRaw = pickValue(value, [
    "matchScore",
    "match_score",
    "score",
    "nilaiKecocokan",
  ]);
  const reasonsRaw = pickValue(value, [
    "reasons",
    "reason",
    "alasan",
    "justifications",
  ]);
  const contentStrategyRaw = pickValue(value, [
    "contentStrategy",
    "content_strategy",
    "strategy",
    "strategiKonten",
    "strategi_konten",
    "recommendedContentStrategy",
  ]);

  let normalizedReasons = reasonsRaw;
  if (typeof reasonsRaw === "string") {
    normalizedReasons = [reasonsRaw];
  }
  if (Array.isArray(reasonsRaw)) {
    normalizedReasons = reasonsRaw
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
  }

  let normalizedMatchScore = matchScoreRaw;
  if (typeof matchScoreRaw === "string" && matchScoreRaw.trim().length > 0) {
    normalizedMatchScore = Number.parseFloat(matchScoreRaw);
  }
  if (
    typeof normalizedMatchScore === "number" &&
    Number.isFinite(normalizedMatchScore)
  ) {
    normalizedMatchScore = Math.round(
      Math.min(100, Math.max(0, normalizedMatchScore))
    );
  }

  let normalizedInfluencerId = influencerIdRaw;
  if (
    isRecord(influencerIdRaw) &&
    (typeof influencerIdRaw.id === "string" ||
      typeof influencerIdRaw.id === "number")
  ) {
    normalizedInfluencerId = influencerIdRaw.id;
  } else if (
    nestedInfluencer &&
    (typeof nestedInfluencer.id === "string" ||
      typeof nestedInfluencer.id === "number")
  ) {
    normalizedInfluencerId = nestedInfluencer.id;
  }

  return {
    influencerId:
      typeof normalizedInfluencerId === "string" ||
      typeof normalizedInfluencerId === "number"
        ? String(normalizedInfluencerId)
        : normalizedInfluencerId,
    matchScore: normalizedMatchScore,
    reasons: normalizedReasons,
    contentStrategy: contentStrategyRaw,
  };
};

const normalizeRecommendationOutput = (value: unknown): unknown => {
  const parsedValue = tryParseLooseJson(value);

  if (Array.isArray(parsedValue)) {
    return {
      recommendations: parsedValue.map((item) => normalizeRecommendationItem(item)),
      summary: "Ringkasan rekomendasi kampanye.",
    };
  }

  if (!isRecord(parsedValue)) {
    return parsedValue;
  }

  const nestedPayload = pickValue(parsedValue, [
    "data",
    "result",
    "output",
    "response",
  ]);
  if (isRecord(nestedPayload) || Array.isArray(nestedPayload)) {
    return normalizeRecommendationOutput(nestedPayload);
  }

  const recommendationsRaw = pickValue(parsedValue, [
    "recommendations",
    "recommendation",
    "items",
    "matches",
    "rekomendasi",
  ]);
  const summaryRaw = pickValue(parsedValue, [
    "summary",
    "ringkasan",
    "analysis",
    "kesimpulan",
  ]);

  const normalizedSummary =
    typeof summaryRaw === "string"
      ? summaryRaw
      : Array.isArray(summaryRaw)
        ? summaryRaw.map((item) => String(item)).join(" ")
        : summaryRaw;

  return {
    recommendations: Array.isArray(recommendationsRaw)
      ? recommendationsRaw.map((item) => normalizeRecommendationItem(item))
      : recommendationsRaw,
    summary: normalizedSummary,
  };
};

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenizeText = (value: string): Set<string> =>
  new Set(
    normalizeText(value)
      .split(" ")
      .filter((token) => token.length >= 3)
  );

const calculateOverlapRatio = (left: string, right: string): number => {
  const leftTokens = tokenizeText(left);
  const rightTokens = tokenizeText(right);

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(1, Math.min(leftTokens.size, rightTokens.size));
};

const buildDeterministicRecommendations = (
  campaign: CampaignPayload,
  influencers: Influencer[]
): RecommendationOutput => {
  const budgetPerInfluencer = campaign.budget / 4;

  const ranked = influencers
    .map((influencer) => {
      const nicheSource = [
        influencer.niche,
        influencer.content_categories?.join(" ") ?? "",
      ].join(" ");
      const nicheOverlap = calculateOverlapRatio(campaign.niche, nicheSource);
      const locationOverlap = calculateOverlapRatio(
        campaign.location,
        influencer.location
      );
      const engagementScore = Math.min(
        1,
        Math.max(0, influencer.engagement_rate / 8)
      );
      const budgetScore =
        influencer.price_per_post <= campaign.budget
          ? influencer.price_per_post <= budgetPerInfluencer
            ? 1
            : Math.max(0.4, 1 - (influencer.price_per_post - budgetPerInfluencer) / campaign.budget)
          : 0;

      const finalScore = Math.round(
        Math.min(
          100,
          Math.max(
            0,
            nicheOverlap * 45 +
              locationOverlap * 20 +
              engagementScore * 20 +
              budgetScore * 15
          )
        )
      );

      const reasons: string[] = [];
      if (nicheOverlap > 0.25) {
        reasons.push("Niche dan kategori konten relevan dengan kebutuhan kampanye.");
      }
      if (locationOverlap > 0.2) {
        reasons.push("Lokasi influencer sejalan dengan target pasar kampanye.");
      }
      if (influencer.engagement_rate >= 3.5) {
        reasons.push(
          `Engagement rate ${influencer.engagement_rate}% cukup kuat untuk mendorong awareness.`
        );
      }
      if (influencer.price_per_post <= campaign.budget) {
        reasons.push("Estimasi biaya konten masih dalam rentang budget kampanye.");
      }
      if (reasons.length === 0) {
        reasons.push("Profil influencer memiliki potensi menjangkau target audiens kampanye.");
      }

      return {
        influencerId: influencer.id,
        matchScore: finalScore,
        reasons,
        contentStrategy: `Buat konten ${campaign.campaign_type.toLowerCase()} yang menonjolkan value utama ${campaign.niche}, dengan call-to-action yang relevan untuk ${campaign.target_audience.toLowerCase()}.`,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  const recommendations = ranked.slice(0, Math.min(5, ranked.length));
  return {
    recommendations,
    summary: `${FALLBACK_SUMMARY_PREFIX} Dipilih ${recommendations.length} influencer dengan skor kecocokan tertinggi berdasarkan niche, lokasi, engagement, dan budget.`,
  };
};

const parseRecommendationOutput = (value: unknown): RecommendationOutput => {
  const parsed = recommendationSchema.safeParse(
    normalizeRecommendationOutput(value)
  );
  if (!parsed.success) {
    throw new RecommendationSchemaError();
  }
  return parsed.data;
};

const isRecommendationSchemaError = (error: unknown): boolean =>
  error instanceof RecommendationSchemaError;

export function createAiRecommendationService(
  config: AiConfig,
  dependencies: AiServiceDependencies = defaultDependencies
): AiRecommendationService {
  const keyRotator: ApiKeyRotator = createApiKeyRotator(config.apiKeys);

  const attemptGeneration = async (
    campaign: CampaignPayload,
    influencers: Influencer[]
  ): Promise<RecommendationOutput> => {
    const currentKey = keyRotator.getNextKey();

    try {
      const provider = dependencies.createProvider(currentKey);
      const model = provider.model(config.model);

      const result = await dependencies.generateText({
        model,
        system: buildSystemPrompt(),
        prompt: buildUserPrompt(campaign, influencers),
        output: Output.object({ schema: recommendationSchema }),
      });

      return parseRecommendationOutput(result.output);
    } catch (error) {
      if (
        NoObjectGeneratedError.isInstance(error) ||
        isRecommendationSchemaError(error)
      ) {
        const provider = dependencies.createProvider(currentKey);
        const fallbackModel = provider.model(config.model);

        const fallbackResult = await dependencies.generateText({
          model: fallbackModel,
          system: `${buildSystemPrompt()}

Balas hanya JSON valid yang sesuai schema. Jangan tambahkan markdown/code fence.`,
          prompt: buildUserPrompt(campaign, influencers),
          output: Output.json(),
        });

        return parseRecommendationOutput(fallbackResult.output);
      }

      if (isRateLimitError(error)) {
        keyRotator.markKeyFailed(currentKey);
        if (!keyRotator.hasAvailableKeys()) {
          throw new Error(RATE_LIMIT_ERROR_MSG);
        }
      }
      throw error;
    }
  };

  const generateWithRetry = async (
    campaign: CampaignPayload,
    influencers: Influencer[],
    maxRetries?: number
  ): Promise<RecommendationOutput> => {
    const retries = maxRetries ?? config.apiKeys.length * 2;
    let lastError: Error | null = null;
    let consecutiveProviderErrors = 0;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const result = await attemptGeneration(campaign, influencers);
        consecutiveProviderErrors = 0;
        return result;
      } catch (error) {
        lastError = toError(error);
        ensureRetryableError(error);
        consecutiveProviderErrors = updateConsecutiveProviderErrors(
          error,
          consecutiveProviderErrors
        );
        await sleep(calculateRetryDelay(attempt));
      }
    }

    throwRetryExhaustedError(lastError);
  };

  const generateRecommendations = async (
    campaign: CampaignPayload,
    influencers: Influencer[]
  ): Promise<RecommendationOutput> => {
    if (influencers.length === 0) {
      return Promise.resolve({
        recommendations: [],
        summary:
          "Tidak ada influencer yang tersedia untuk kriteria kampanye ini.",
      });
    }

    try {
      return await generateWithRetry(campaign, influencers);
    } catch (error) {
      console.warn(
        "Fallback ke rekomendasi deterministik karena AI gagal menghasilkan output valid.",
        error
      );
      return buildDeterministicRecommendations(campaign, influencers);
    }
  };

  return { generateRecommendations };
}
