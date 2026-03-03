import type { Review } from "../../../src/types";
import {
  createInternalServerError,
  createNodeFunctionLogger,
  emitAndReturn,
} from "../../lib/evlog";
import { createSupabaseClient } from "../../lib/supabase-client";

interface ReviewsHandlerDependencies {
  getReviewsByInfluencer: (influencerId: string) => Promise<Review[]>;
}

type ReviewsDependenciesFactory = () => ReviewsHandlerDependencies;

const createReviewsDependencies: ReviewsDependenciesFactory = () => {
  const supabase = createSupabaseClient();

  return {
    async getReviewsByInfluencer(influencerId: string) {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, order:orders(*)")
        .eq("orders.influencer_id", influencerId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data as Review[];
    },
  };
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export const createReviewsHandler = (
  dependenciesFactory: ReviewsDependenciesFactory = createReviewsDependencies
) =>
  async function onRequest(context: { request: Request }) {
    const { request } = context;
    const log = createNodeFunctionLogger(request);
    let response: Response;

    if (request.method !== "GET") {
      response = jsonResponse({ message: "Metode tidak diizinkan." }, 405);
      return emitAndReturn(log, response);
    }

    const url = new URL(request.url);
    const influencerId = url.searchParams.get("influencer_id");

    if (!influencerId) {
      response = jsonResponse({ message: "ID influencer wajib diisi." }, 400);
      return emitAndReturn(log, response);
    }

    try {
      const { getReviewsByInfluencer } = dependenciesFactory();
      const reviews = await getReviewsByInfluencer(influencerId);
      log.set({
        influencer: { id: influencerId },
        reviews: { count: reviews.length },
      });

      response = jsonResponse({ data: reviews }, 200);
      return emitAndReturn(log, response);
    } catch (error) {
      const structuredError = createInternalServerError(
        error,
        "Terjadi kesalahan saat memuat ulasan.",
        "Coba lagi beberapa saat lagi."
      );
      log.error(structuredError, { action: "list-reviews" });
      response = jsonResponse({ message: structuredError.message }, 500);
      return emitAndReturn(log, response);
    }
  };

export const onRequest = createReviewsHandler();
