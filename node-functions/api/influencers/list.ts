import type { FilterOptions, Influencer } from "../../../src/types";
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

interface InfluencersListHandlerDependencies {
  listInfluencers: (filters?: FilterOptions) => Promise<Influencer[]>;
}

type InfluencersDependenciesFactory = () => InfluencersListHandlerDependencies;

interface InfluencerListQuery {
  eq: (column: string, value: string | number | boolean) => InfluencerListQuery;
  ilike: (column: string, value: string) => InfluencerListQuery;
  gte: (column: string, value: number) => InfluencerListQuery;
  lte: (column: string, value: number) => InfluencerListQuery;
}

const applyInfluencerFilters = <TQuery extends InfluencerListQuery>(
  query: TQuery,
  filters?: FilterOptions
): TQuery => {
  let filteredQuery = query;

  if (filters?.niche && filters.niche !== "Semua Niche") {
    filteredQuery = filteredQuery.eq("niche", filters.niche) as TQuery;
  }

  if (filters?.location && filters.location !== "Semua Lokasi") {
    const sanitized = filters.location.replace(/[%_]/g, "\\$&");
    filteredQuery = filteredQuery.ilike("location", `%${sanitized}%`) as TQuery;
  }

  if (filters?.minPrice !== undefined && filters.minPrice > 0) {
    filteredQuery = filteredQuery.gte(
      "price_per_post",
      filters.minPrice
    ) as TQuery;
  }

  if (filters?.maxPrice !== undefined && filters.maxPrice > 0) {
    filteredQuery = filteredQuery.lte(
      "price_per_post",
      filters.maxPrice
    ) as TQuery;
  }

  if (filters?.verificationStatus && filters.verificationStatus !== "all") {
    filteredQuery = filteredQuery.eq(
      "verification_status",
      filters.verificationStatus
    ) as TQuery;
  }

  return filteredQuery;
};

const createInfluencersListDependencies: InfluencersDependenciesFactory =
  () => {
    const supabase = createSupabaseClient();

    return {
      async listInfluencers(filters?: FilterOptions) {
        let query = supabase
          .from("influencers")
          .select("*")
          .eq("is_available", true);

        query = applyInfluencerFilters(query, filters);

        query = query.order("followers_count", { ascending: false });

        const { data, error } = await query;

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

export const createInfluencersListHandler = (
  dependenciesFactory: InfluencersDependenciesFactory = createInfluencersListDependencies
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
      const { listInfluencers } = dependenciesFactory();

      const url = new URL(request.url);
      const maxPriceParam = url.searchParams.get("maxPrice");
      const filters: FilterOptions = {
        niche: url.searchParams.get("niche") || undefined,
        location: url.searchParams.get("location") || undefined,
        minPrice: url.searchParams.get("minPrice")
          ? Number(url.searchParams.get("minPrice"))
          : undefined,
        maxPrice: maxPriceParam ? Number(maxPriceParam) : undefined,
        verificationStatus:
          url.searchParams.get("verificationStatus") || undefined,
      };

      const influencers = await listInfluencers(filters);
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
      log.error(structuredError, { action: "list-influencers" });
      response = jsonResponse({ message: structuredError.message }, 500);
      return emitAndReturn(log, response);
    }
  };

export const onRequest = createInfluencersListHandler();
