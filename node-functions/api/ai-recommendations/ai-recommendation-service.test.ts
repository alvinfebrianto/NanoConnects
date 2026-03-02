import { describe, expect, it, vi } from "vitest";
import type { Influencer } from "../../../src/types";
import {
  createAiRecommendationService,
  type GenerateTextFn,
} from "./ai-recommendation-service";

const mockInfluencers: Influencer[] = [
  {
    id: "inf-1",
    user_id: "user-1",
    followers_count: 50_000,
    engagement_rate: 5.5,
    niche: "Kuliner",
    price_per_post: 300_000,
    instagram_handle: "@foodie",
    location: "Jakarta",
    languages: ["Indonesian"],
    content_categories: ["Food", "Reviews"],
    is_available: true,
    avg_delivery_days: 3,
    verification_status: "verified",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    user: {
      id: "user-1",
      name: "Food Blogger",
      email: "food@test.com",
      user_type: "influencer",
      email_verified: true,
      status: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  },
];

const mockCampaign = {
  niche: "Kuliner",
  company_size: "1-5 orang",
  budget: 5_000_000,
  target_audience: "Pecinta kuliner Jakarta",
  location: "Jakarta",
  campaign_type: "Brand awareness",
};

describe("AiRecommendationService", () => {
  describe("schema validation", () => {
    it("defines correct Zod schema for recommendations", async () => {
      const { recommendationSchema } = await import(
        "./ai-recommendation-schema"
      );

      const validInput = {
        recommendations: [
          {
            influencerId: "inf-1",
            matchScore: 85,
            reasons: ["Niche cocok", "Lokasi sesuai"],
            contentStrategy: "Review makanan lokal",
          },
        ],
        summary: "Rekomendasi terbaik untuk kampanye kuliner",
      };

      const result = recommendationSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("rejects invalid matchScore outside 0-100 range", async () => {
      const { recommendationSchema } = await import(
        "./ai-recommendation-schema"
      );

      const invalidInput = {
        recommendations: [
          {
            influencerId: "inf-1",
            matchScore: 150,
            reasons: ["Test"],
            contentStrategy: "Test",
          },
        ],
        summary: "Test",
      };

      const result = recommendationSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("rejects missing required fields", async () => {
      const { recommendationSchema } = await import(
        "./ai-recommendation-schema"
      );

      const invalidInput = {
        recommendations: [
          {
            influencerId: "inf-1",
          },
        ],
        summary: "Test",
      };

      const result = recommendationSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe("service creation", () => {
    it("creates service with valid config", () => {
      const mockGenerateText: GenerateTextFn = vi.fn();

      const service = createAiRecommendationService(
        {
          apiKeys: ["test-key-1", "test-key-2"],
          model: "openai/gpt-4o-mini",
        },
        {
          generateText: mockGenerateText,
          createProvider: () => ({ model: () => "mock-model" }),
        }
      );

      expect(service).toBeDefined();
      expect(service.generateRecommendations).toBeTypeOf("function");
    });
  });

  describe("generateRecommendations", () => {
    it("returns structured recommendations with AI SDK", async () => {
      const mockGenerateText: GenerateTextFn = vi.fn().mockResolvedValue({
        output: {
          recommendations: [
            {
              influencerId: "inf-1",
              matchScore: 92,
              reasons: ["Spesialisasi kuliner cocok"],
              contentStrategy: "Review resto Jakarta",
            },
          ],
          summary: "Influencer kuliner terbaik untuk kampanye Anda",
        },
      });

      const service = createAiRecommendationService(
        {
          apiKeys: ["test-key"],
          model: "test-model",
        },
        {
          generateText: mockGenerateText,
          createProvider: () => ({ model: () => "mock-model" }),
        }
      );

      const result = await service.generateRecommendations(
        mockCampaign,
        mockInfluencers
      );

      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].influencerId).toBe("inf-1");
      expect(result.recommendations[0].matchScore).toBe(92);
      expect(result.summary).toContain("Influencer");
    });

    it("normalizes near-valid AI output before schema validation", async () => {
      const mockGenerateText: GenerateTextFn = vi.fn().mockResolvedValue({
        output: {
          recommendations: [
            {
              influencer_id: 123,
              match_score: "88",
              reasons: "Niche sangat relevan",
              content_strategy: "Konten review dan edukasi produk",
            },
          ],
          summary: "Rekomendasi sudah disesuaikan.",
        },
      });

      const service = createAiRecommendationService(
        {
          apiKeys: ["test-key"],
          model: "test-model",
        },
        {
          generateText: mockGenerateText,
          createProvider: () => ({ model: () => "mock-model" }),
        }
      );

      const result = await service.generateRecommendations(
        mockCampaign,
        mockInfluencers
      );

      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].influencerId).toBe("123");
      expect(result.recommendations[0].matchScore).toBe(88);
      expect(result.recommendations[0].reasons).toEqual([
        "Niche sangat relevan",
      ]);
      expect(result.recommendations[0].contentStrategy).toBe(
        "Konten review dan edukasi produk"
      );
    });

    it("extracts and parses JSON payload embedded in text", async () => {
      const mockGenerateText: GenerateTextFn = vi.fn().mockResolvedValue({
        output: `Berikut hasil rekomendasi:
{
  "recommendations": [
    {
      "influencerId": "inf-1",
      "matchScore": 81,
      "reasons": ["Cocok dengan niche"],
      "contentStrategy": "Konten tutorial singkat"
    }
  ],
  "summary": "Rekomendasi dari model."
}`,
      });

      const service = createAiRecommendationService(
        {
          apiKeys: ["test-key"],
          model: "test-model",
        },
        {
          generateText: mockGenerateText,
          createProvider: () => ({ model: () => "mock-model" }),
        }
      );

      const result = await service.generateRecommendations(
        mockCampaign,
        mockInfluencers
      );

      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].influencerId).toBe("inf-1");
      expect(result.summary).toContain("Rekomendasi");
    });

    it("normalizes alternative key formats and numeric coercions", async () => {
      const mockGenerateText: GenerateTextFn = vi.fn().mockResolvedValue({
        output: {
          matches: [
            {
              influencer: { id: "inf-1" },
              score: "88.7",
              justifications: ["Niche relevan", 123],
              strategi_konten: "Konten review produk lokal",
            },
          ],
          kesimpulan: ["Rekomendasi cocok", "untuk kampanye ini."],
        },
      });

      const service = createAiRecommendationService(
        {
          apiKeys: ["test-key"],
          model: "test-model",
        },
        {
          generateText: mockGenerateText,
          createProvider: () => ({ model: () => "mock-model" }),
        }
      );

      const result = await service.generateRecommendations(
        mockCampaign,
        mockInfluencers
      );

      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].influencerId).toBe("inf-1");
      expect(result.recommendations[0].matchScore).toBe(89);
      expect(result.recommendations[0].reasons).toEqual(["Niche relevan", "123"]);
      expect(result.recommendations[0].contentStrategy).toBe(
        "Konten review produk lokal"
      );
      expect(result.summary).toContain("Rekomendasi cocok");
    });

    it("handles empty influencer list gracefully", async () => {
      const mockGenerateText: GenerateTextFn = vi.fn();

      const service = createAiRecommendationService(
        {
          apiKeys: ["test-key"],
          model: "test-model",
        },
        {
          generateText: mockGenerateText,
          createProvider: () => ({ model: () => "mock-model" }),
        }
      );

      const result = await service.generateRecommendations(mockCampaign, []);

      expect(result.recommendations).toHaveLength(0);
      expect(result.summary).toContain("Tidak ada influencer");
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it("rotates API key on rate limit and retries", async () => {
      const usedKeys: string[] = [];

      const mockGenerateText: GenerateTextFn = vi
        .fn()
        .mockImplementation(() => {
          const currentKey = usedKeys.at(-1);
          if (currentKey === "key-1") {
            const error = new Error("Rate limit exceeded");
            (error as unknown as Record<string, unknown>).status = 429;
            throw error;
          }
          return Promise.resolve({
            output: {
              recommendations: [
                {
                  influencerId: "inf-1",
                  matchScore: 80,
                  reasons: ["Test"],
                  contentStrategy: "Test",
                },
              ],
              summary: "Success on retry",
            },
          });
        });

      const service = createAiRecommendationService(
        {
          apiKeys: ["key-1", "key-2"],
          model: "test-model",
        },
        {
          generateText: mockGenerateText,
          createProvider: (apiKey: string) => {
            usedKeys.push(apiKey);
            return { model: () => `model-with-${apiKey}` };
          },
        }
      );

      const result = await service.generateRecommendations(
        mockCampaign,
        mockInfluencers
      );

      expect(result.recommendations).toHaveLength(1);
      expect(result.summary).toBe("Success on retry");
      expect(usedKeys).toContain("key-1");
      expect(usedKeys).toContain("key-2");
    });

    it("falls back deterministically when all API keys exhausted", async () => {
      const rateLimitError = new Error("Rate limit exceeded");
      (rateLimitError as unknown as Record<string, unknown>).status = 429;

      const mockGenerateText: GenerateTextFn = vi
        .fn()
        .mockRejectedValue(rateLimitError);

      const service = createAiRecommendationService(
        {
          apiKeys: ["key-1"],
          model: "test-model",
        },
        {
          generateText: mockGenerateText,
          createProvider: () => ({ model: () => "mock-model" }),
        }
      );

      const result = await service.generateRecommendations(
        mockCampaign,
        mockInfluencers
      );

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.summary).toContain("respons AI tidak konsisten");
    });

    it("retries when fallback JSON still fails schema validation", async () => {
      const mockGenerateText: GenerateTextFn = vi
        .fn()
        .mockResolvedValueOnce({
          output: {
            recommendations: [
              {
                influencerId: "inf-1",
                matchScore: "invalid-score",
                reasons: [],
                contentStrategy: "",
              },
            ],
            summary: "Output pertama tidak valid",
          },
        })
        .mockResolvedValueOnce({
          output: {
            recommendations: [],
            summary: "Fallback pertama juga tidak valid",
          },
        })
        .mockResolvedValueOnce({
          output: {
            recommendations: [
              {
                influencerId: "inf-1",
                matchScore: 84,
                reasons: ["Cocok untuk niche kampanye"],
                contentStrategy: "Review dan demo produk",
              },
            ],
            summary: "Berhasil setelah retry",
          },
        });

      const service = createAiRecommendationService(
        {
          apiKeys: ["key-1", "key-2"],
          model: "test-model",
        },
        {
          generateText: mockGenerateText,
          createProvider: () => ({ model: () => "mock-model" }),
        }
      );

      const result = await service.generateRecommendations(
        mockCampaign,
        mockInfluencers
      );

      expect(result.recommendations).toHaveLength(1);
      expect(result.summary).toBe("Berhasil setelah retry");
      expect(mockGenerateText).toHaveBeenCalledTimes(3);
    });

    it("returns deterministic fallback when AI keeps failing", async () => {
      const mockGenerateText: GenerateTextFn = vi
        .fn()
        .mockRejectedValue(new Error("Unexpected provider response"));

      const service = createAiRecommendationService(
        {
          apiKeys: ["key-1"],
          model: "test-model",
        },
        {
          generateText: mockGenerateText,
          createProvider: () => ({ model: () => "mock-model" }),
        }
      );

      const result = await service.generateRecommendations(
        mockCampaign,
        mockInfluencers
      );

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0].influencerId).toBe("inf-1");
      expect(result.recommendations[0].matchScore).toBeGreaterThanOrEqual(0);
      expect(result.recommendations[0].matchScore).toBeLessThanOrEqual(100);
      expect(result.summary).toContain("respons AI tidak konsisten");
    });
  });
});
