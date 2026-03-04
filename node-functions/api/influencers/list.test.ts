import { describe, expect, it, vi } from "vitest";
import type { Influencer } from "../../../src/types";
import { createInfluencersListHandler } from "./list";

const createContext = (url: string) => ({
  request: new Request(url, { method: "GET" }),
});

const mockInfluencers: Influencer[] = [
  {
    id: "inf-1",
    user_id: "user-1",
    followers_count: 150_000,
    engagement_rate: 4.5,
    niche: "Fashion & Gaya Hidup",
    price_per_post: 500_000,
    instagram_handle: "@fashionista",
    location: "Jakarta",
    languages: ["Indonesian", "English"],
    content_categories: ["Fashion", "Lifestyle"],
    is_available: true,
    verification_status: "verified",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: "user-1",
      name: "Sarah Johnson",
      email: "sarah@example.com",
      user_type: "influencer",
      avatar_url: "https://example.com/avatar1.jpg",
      bio: "Fashion influencer",
      status: "active",
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: "inf-2",
    user_id: "user-2",
    followers_count: 85_000,
    engagement_rate: 6.2,
    niche: "Teknologi",
    price_per_post: 350_000,
    instagram_handle: "@techguru",
    location: "Surabaya",
    languages: ["Indonesian"],
    content_categories: ["Technology", "Gadgets"],
    is_available: true,
    verification_status: "verified",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: "user-2",
      name: "Mike Chen",
      email: "mike@example.com",
      user_type: "influencer",
      avatar_url: "https://example.com/avatar2.jpg",
      bio: "Tech reviewer",
      status: "active",
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: "inf-3",
    user_id: "user-3",
    followers_count: 120_000,
    engagement_rate: 5.0,
    niche: "Fashion & Gaya Hidup",
    price_per_post: 450_000,
    instagram_handle: "@styleicon",
    location: "Bandung",
    languages: ["Indonesian"],
    content_categories: ["Fashion", "Beauty"],
    is_available: true,
    verification_status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: "user-3",
      name: "Emma Wilson",
      email: "emma@example.com",
      user_type: "influencer",
      avatar_url: "https://example.com/avatar3.jpg",
      bio: "Style and beauty",
      status: "active",
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: "inf-4",
    user_id: "user-4",
    followers_count: 200_000,
    engagement_rate: 3.8,
    niche: "Kuliner & Makanan",
    price_per_post: 600_000,
    instagram_handle: "@foodie",
    location: "Jakarta",
    languages: ["Indonesian", "English"],
    content_categories: ["Food", "Culinary"],
    is_available: false,
    verification_status: "verified",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: "user-4",
      name: "John Doe",
      email: "john@example.com",
      user_type: "influencer",
      avatar_url: "https://example.com/avatar4.jpg",
      bio: "Food enthusiast",
      status: "active",
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
];

describe("influencers list node function", () => {
  describe("GET /api/influencers/list", () => {
    it("mengembalikan semua influencer yang tersedia tanpa filter", async () => {
      const handler = createInfluencersListHandler(() => ({
        listInfluencers: async () =>
          mockInfluencers.filter((inf) => inf.is_available),
      }));

      const response = await handler(
        createContext("https://example.com/api/influencers/list")
      );
      const payload = (await response.json()) as { data: Influencer[] };

      expect(response.status).toBe(200);
      expect(payload.data).toHaveLength(3);
      expect(payload.data.every((inf) => inf.is_available)).toBe(true);
    });

    it("hanya mengembalikan field publik pada data user influencer", async () => {
      const handler = createInfluencersListHandler(() => ({
        listInfluencers: async () => [
          {
            ...mockInfluencers[0],
            user: {
              ...mockInfluencers[0].user,
              password_hash: "secret-hash",
              phone: "+6281234567890",
            } as unknown as Influencer["user"],
          },
        ],
      }));

      const response = await handler(
        createContext("https://example.com/api/influencers/list")
      );
      const payload = (await response.json()) as {
        data: Array<{ user?: Record<string, unknown> }>;
      };

      expect(response.status).toBe(200);
      expect(payload.data[0]?.user).toEqual({
        id: "user-1",
        name: "Sarah Johnson",
        avatar_url: "https://example.com/avatar1.jpg",
        bio: "Fashion influencer",
      });
      expect(payload.data[0]?.user).not.toHaveProperty("email");
      expect(payload.data[0]?.user).not.toHaveProperty("password_hash");
      expect(payload.data[0]?.user).not.toHaveProperty("phone");
    });

    it("memfilter influencer berdasarkan niche", async () => {
      const handler = createInfluencersListHandler(() => ({
        listInfluencers: async () =>
          mockInfluencers.filter(
            (inf) => inf.is_available && inf.niche === "Fashion & Gaya Hidup"
          ),
      }));

      const response = await handler(
        createContext(
          "https://example.com/api/influencers/list?niche=Fashion%20%26%20Gaya%20Hidup"
        )
      );
      const payload = (await response.json()) as { data: Influencer[] };

      expect(response.status).toBe(200);
      expect(payload.data).toHaveLength(2);
      expect(
        payload.data.every((inf) => inf.niche === "Fashion & Gaya Hidup")
      ).toBe(true);
    });

    it("memfilter influencer berdasarkan lokasi", async () => {
      const listInfluencers = vi.fn(async () => [mockInfluencers[0]]);
      const handler = createInfluencersListHandler(() => ({
        listInfluencers,
      }));

      const response = await handler(
        createContext(
          "https://example.com/api/influencers/list?location=Jakarta"
        )
      );
      const payload = (await response.json()) as { data: Influencer[] };

      expect(listInfluencers).toHaveBeenCalledWith(
        expect.objectContaining({ location: "Jakarta" })
      );
      expect(response.status).toBe(200);
      expect(payload.data).toHaveLength(1);
      expect(payload.data[0]?.location).toBe("Jakarta");
    });

    it("memfilter influencer berdasarkan rentang harga", async () => {
      const listInfluencers = vi.fn(async () => [
        mockInfluencers[0],
        mockInfluencers[2],
      ]);
      const handler = createInfluencersListHandler(() => ({
        listInfluencers,
      }));

      const response = await handler(
        createContext(
          "https://example.com/api/influencers/list?minPrice=400000&maxPrice=500000"
        )
      );
      const payload = (await response.json()) as { data: Influencer[] };

      expect(listInfluencers).toHaveBeenCalledWith(
        expect.objectContaining({ minPrice: 400_000, maxPrice: 500_000 })
      );
      expect(response.status).toBe(200);
      expect(payload.data).toHaveLength(2);
      expect(
        payload.data.every(
          (inf) =>
            inf.price_per_post >= 400_000 && inf.price_per_post <= 500_000
        )
      ).toBe(true);
    });

    it("memfilter influencer berdasarkan status verifikasi", async () => {
      const listInfluencers = vi.fn(async () => [
        mockInfluencers[0],
        mockInfluencers[1],
      ]);
      const handler = createInfluencersListHandler(() => ({
        listInfluencers,
      }));

      const response = await handler(
        createContext(
          "https://example.com/api/influencers/list?verificationStatus=verified"
        )
      );
      const payload = (await response.json()) as { data: Influencer[] };

      expect(listInfluencers).toHaveBeenCalledWith(
        expect.objectContaining({ verificationStatus: "verified" })
      );
      expect(response.status).toBe(200);
      expect(payload.data).toHaveLength(2);
      expect(
        payload.data.every((inf) => inf.verification_status === "verified")
      ).toBe(true);
    });

    it("menggabungkan beberapa filter sekaligus", async () => {
      const listInfluencers = vi.fn(async () => [mockInfluencers[0]]);
      const handler = createInfluencersListHandler(() => ({
        listInfluencers,
      }));

      const response = await handler(
        createContext(
          "https://example.com/api/influencers/list?niche=Fashion%20%26%20Gaya%20Hidup&location=Jakarta&verificationStatus=verified"
        )
      );
      const payload = (await response.json()) as { data: Influencer[] };

      expect(listInfluencers).toHaveBeenCalledWith(
        expect.objectContaining({
          niche: "Fashion & Gaya Hidup",
          location: "Jakarta",
          verificationStatus: "verified",
        })
      );
      expect(response.status).toBe(200);
      expect(payload.data).toHaveLength(1);
      expect(payload.data[0]?.niche).toBe("Fashion & Gaya Hidup");
      expect(payload.data[0]?.location).toBe("Jakarta");
      expect(payload.data[0]?.verification_status).toBe("verified");
    });

    it("mengembalikan 405 untuk method selain GET", async () => {
      const handler = createInfluencersListHandler(() => ({
        listInfluencers: async () => mockInfluencers,
      }));

      const response = await handler({
        request: new Request("https://example.com/api/influencers/list", {
          method: "POST",
        }),
      });

      expect(response.status).toBe(405);
    });

    it("mengembalikan 500 saat terjadi error", async () => {
      const handler = createInfluencersListHandler(() => ({
        listInfluencers: () => {
          throw new Error("Database error");
        },
      }));

      const response = await handler(
        createContext("https://example.com/api/influencers/list")
      );

      expect(response.status).toBe(500);
    });
  });
});
