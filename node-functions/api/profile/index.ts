import type { Database } from "../../../src/lib/database.types";
import {
  createInternalServerError,
  createNodeFunctionLogger,
  emitAndReturn,
} from "../../lib/evlog";
import { createSupabaseClient } from "../../lib/supabase-client";
import {
  PRIVATE_USER_PROFILE_SELECT,
  type PrivateUserProfile,
} from "../../lib/user-profiles";

type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

type InfluencerRow = Database["public"]["Tables"]["influencers"]["Row"];

interface ProfileHandlerDependencies {
  getUser: (userId: string) => Promise<PrivateUserProfile | null>;
  getInfluencerProfile: (userId: string) => Promise<InfluencerRow | null>;
  updateUser: (userId: string, data: UserUpdate) => Promise<void>;
}

type ProfileDependenciesFactory = (
  accessToken: string
) => ProfileHandlerDependencies;

const createProfileDependencies: ProfileDependenciesFactory = (accessToken) => {
  const supabase = createSupabaseClient(accessToken);

  return {
    async getUser(userId: string) {
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
    async getInfluencerProfile(userId: string) {
      const { data, error } = await supabase
        .from("influencers")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error?.code === "PGRST116") {
        return null;
      }

      if (error) {
        throw error;
      }

      return data;
    },
    async updateUser(userId: string, updateData: UserUpdate) {
      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId);

      if (error) {
        throw error;
      }
    },
  };
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

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

const parseProfilePayload = async (request: Request) => {
  try {
    return (await request.json()) as Partial<{
      name: string;
      phone: string;
      bio: string;
      avatar_url: string;
    }>;
  } catch {
    return null;
  }
};

const validateProfilePayload = (
  payload: ReturnType<typeof parseProfilePayload>
) => {
  if (!payload) {
    return "Payload tidak valid.";
  }

  if (
    payload.name !== undefined &&
    (typeof payload.name !== "string" || payload.name.trim().length < 2)
  ) {
    return "Nama minimal 2 karakter.";
  }

  if (payload.phone !== undefined && typeof payload.phone !== "string") {
    return "Nomor telepon tidak valid.";
  }

  if (payload.bio !== undefined && typeof payload.bio !== "string") {
    return "Bio tidak valid.";
  }

  if (
    payload.avatar_url !== undefined &&
    typeof payload.avatar_url !== "string"
  ) {
    return "URL avatar tidak valid.";
  }

  return null;
};

const getAuthUser = async (accessToken: string) => {
  const supabase = createSupabaseClient(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }
  return data.user;
};

const handleGetProfile = async (
  dependencies: ProfileHandlerDependencies,
  userId: string
) => {
  const userData = await dependencies.getUser(userId);

  if (!userData) {
    return { error: "Pengguna tidak ditemukan.", status: 404 };
  }

  const safeUserData: PrivateUserProfile = {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    user_type: userData.user_type,
    avatar_url: userData.avatar_url,
    bio: userData.bio,
    phone: userData.phone,
    email_verified: userData.email_verified,
    status: userData.status,
    last_login_at: userData.last_login_at,
    created_at: userData.created_at,
    updated_at: userData.updated_at,
  };

  const influencerProfile: InfluencerRow | null =
    userData.user_type === "influencer"
      ? await dependencies.getInfluencerProfile(userId)
      : null;

  return {
    data: { user: safeUserData, influencerProfile },
    status: 200,
  };
};

const handleUpdateProfile = async (
  dependencies: ProfileHandlerDependencies,
  userId: string,
  payload: ReturnType<typeof parseProfilePayload>
) => {
  const validationError = validateProfilePayload(payload);
  if (validationError) {
    return { error: validationError, status: 400 };
  }

  const updateData: UserUpdate = {};

  if (payload.name) {
    updateData.name = payload.name.trim();
  }
  if (payload.phone !== undefined) {
    updateData.phone = payload.phone.trim() || null;
  }
  if (payload.bio !== undefined) {
    updateData.bio = payload.bio.trim() || null;
  }
  if (payload.avatar_url !== undefined) {
    updateData.avatar_url = payload.avatar_url.trim() || null;
  }

  if (Object.keys(updateData).length === 0) {
    return { error: "Tidak ada data untuk diperbarui.", status: 400 };
  }

  await dependencies.updateUser(userId, updateData);
  return { message: "Profil berhasil diperbarui.", status: 200 };
};

const handleGetRequest = async (
  dependencies: ProfileHandlerDependencies,
  userId: string
) => {
  const result = await handleGetProfile(dependencies, userId);

  if (result.error) {
    return jsonResponse({ message: result.error }, result.status);
  }

  return jsonResponse({ data: result.data }, result.status);
};

const handlePatchRequest = async (
  dependencies: ProfileHandlerDependencies,
  userId: string,
  request: Request
) => {
  const payload = await parseProfilePayload(request);
  const result = await handleUpdateProfile(dependencies, userId, payload);

  if (result.error) {
    return jsonResponse({ message: result.error }, result.status);
  }

  return jsonResponse({ message: result.message }, result.status);
};

export const createProfileHandler = (
  dependenciesFactory: ProfileDependenciesFactory = createProfileDependencies
) =>
  async function onRequest(context: { request: Request }) {
    const { request } = context;
    const log = createNodeFunctionLogger(request);
    let response: Response;

    const accessToken = parseBearerToken(request.headers.get("Authorization"));

    if (!accessToken) {
      response = jsonResponse({ message: "Autentikasi diperlukan." }, 401);
      return emitAndReturn(log, response);
    }

    const user = await getAuthUser(accessToken);
    if (!user) {
      response = jsonResponse({ message: "Autentikasi tidak valid." }, 401);
      return emitAndReturn(log, response);
    }

    try {
      const dependencies = dependenciesFactory(accessToken);

      if (request.method === "GET") {
        response = await handleGetRequest(dependencies, user.id);
        return emitAndReturn(log, response);
      }

      if (request.method === "PATCH" || request.method === "PUT") {
        response = await handlePatchRequest(dependencies, user.id, request);
        return emitAndReturn(log, response);
      }

      response = jsonResponse({ message: "Metode tidak diizinkan." }, 405);
      return emitAndReturn(log, response);
    } catch (error) {
      const isGetRequest = request.method === "GET";
      const structuredError = createInternalServerError(
        error,
        isGetRequest
          ? "Terjadi kesalahan saat memuat profil."
          : "Terjadi kesalahan saat memperbarui profil.",
        "Coba lagi beberapa saat lagi."
      );
      log.error(structuredError, {
        action: isGetRequest ? "get-profile" : "update-profile",
      });
      response = jsonResponse({ message: structuredError.message }, 500);
      return emitAndReturn(log, response);
    }
  };

export const onRequest = createProfileHandler();
