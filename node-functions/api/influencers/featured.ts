import type { Influencer } from "../../../src/types";
import {
  createInternalServerError,
  createNodeFunctionLogger,
  emitAndReturn,
} from "../../lib/evlog";
import { createSupabaseClient } from "../../lib/supabase-client";
import {
  attachPublicUserProfiles,
  PUBLIC_USER_PROFILE_SELECT,
  PUBLIC_USER_PROFILE_VIEW,
  sanitizeInfluencersForPublic,
} from "../../lib/user-profiles";

interface FeaturedInfluencersHandlerDependencies {
  getFeaturedInfluencers: () => Promise<Influencer[]>;
}

type FeaturedInfluencersDependenciesFactory =
  () => FeaturedInfluencersHandlerDependencies;

const createFeaturedInfluencersDependencies: FeaturedInfluencersDependenciesFactory =
  () => {
    const supabase = createSupabaseClient();

    return {
      async getFeaturedInfluencers() {
        const { data, error } = await supabase
          .from("influencers")
          .select("*")
          .eq("verification_status", "verified")
          .eq("is_available", true)
          .order("followers_count", { ascending: false })
          .limit(6);

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
    };
  };

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export const createFeaturedInfluencersHandler = (
  dependenciesFactory: FeaturedInfluencersDependenciesFactory = createFeaturedInfluencersDependencies
) =>
  async function onRequest(context: { request: Request }) {
    const { request } = context;
    const log = createNodeFunctionLogger(request);
    let response: Response;

    if (request.method !== "GET") {
      response = jsonResponse({ message: "Metode tidak diizinkan." }, 405);
      return emitAndReturn(log, response);
    }

    try {
      const { getFeaturedInfluencers } = dependenciesFactory();
      const influencers = await getFeaturedInfluencers();
      const publicInfluencers = sanitizeInfluencersForPublic(influencers);
      log.set({ influencers: { count: publicInfluencers.length } });

      response = jsonResponse({ data: publicInfluencers }, 200);
      return emitAndReturn(log, response);
    } catch (error) {
      const structuredError = createInternalServerError(
        error,
        "Terjadi kesalahan saat memuat influencer.",
        "Coba lagi beberapa saat lagi."
      );
      log.error(structuredError, { action: "list-featured-influencers" });
      response = jsonResponse({ message: structuredError.message }, 500);
      return emitAndReturn(log, response);
    }
  };

export const onRequest = createFeaturedInfluencersHandler();
