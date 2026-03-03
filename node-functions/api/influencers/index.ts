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
  sanitizeInfluencerForPublic,
} from "../../lib/user-profiles";

interface InfluencerHandlerDependencies {
  getInfluencer: (influencerId: string) => Promise<Influencer | null>;
}

type InfluencerDependenciesFactory = () => InfluencerHandlerDependencies;

const createInfluencerDependencies: InfluencerDependenciesFactory = () => {
  const supabase = createSupabaseClient();

  return {
    async getInfluencer(influencerId) {
      const { data: influencerData, error } = await supabase
        .from("influencers")
        .select("*")
        .eq("id", influencerId)
        .single();

      if (error?.code === "PGRST116") {
        return null;
      }

      if (error) {
        throw error;
      }

      const { data: userProfile, error: userProfileError } = await supabase
        .from(PUBLIC_USER_PROFILE_VIEW)
        .select(PUBLIC_USER_PROFILE_SELECT)
        .eq("id", influencerData.user_id)
        .maybeSingle();

      if (userProfileError) {
        throw userProfileError;
      }

      const [influencer] = attachPublicUserProfiles(
        [influencerData as Influencer],
        userProfile ? [userProfile] : []
      );

      return influencer;
    },
  };
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export const createInfluencersHandler = (
  dependenciesFactory: InfluencerDependenciesFactory = createInfluencerDependencies
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
    const influencerId = url.searchParams.get("id");

    if (!influencerId) {
      response = jsonResponse({ message: "ID influencer wajib diisi." }, 400);
      return emitAndReturn(log, response);
    }

    try {
      const { getInfluencer } = dependenciesFactory();
      const influencer = await getInfluencer(influencerId);

      if (!influencer) {
        response = jsonResponse(
          { message: "Influencer tidak ditemukan." },
          404
        );
        return emitAndReturn(log, response);
      }

      log.set({ influencer: { id: influencer.id } });
      response = jsonResponse(
        { data: sanitizeInfluencerForPublic(influencer) },
        200
      );
      return emitAndReturn(log, response);
    } catch (error) {
      const structuredError = createInternalServerError(
        error,
        "Terjadi kesalahan saat memuat influencer.",
        "Coba lagi beberapa saat lagi."
      );
      log.error(structuredError, { action: "get-influencer" });
      response = jsonResponse({ message: structuredError.message }, 500);
      return emitAndReturn(log, response);
    }
  };

export const onRequest = createInfluencersHandler();
