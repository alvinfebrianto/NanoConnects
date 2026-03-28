import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

interface SupabaseEnvConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  mode?: string;
}

const createDummyClient = () => {
  console.warn("Supabase environment variables not set. Using dummy client.");
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => {
              return;
            },
          },
        },
      }),
      signInWithPassword: async () => ({
        error: new Error("Supabase not configured"),
      }),
      signUp: async () => ({
        error: new Error("Supabase not configured"),
        data: { user: null },
      }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({ data: [], error: null }),
          }),
          single: () => ({ data: null, error: null }),
        }),
        order: () => ({
          limit: () => ({ data: [], error: null }),
        }),
      }),
      insert: async () => ({ error: null }),
    }),
    rpc: async () => ({ data: [], error: null }),
  } as unknown as ReturnType<typeof createClient<Database>>;
};

export const createSupabaseClientFromEnv = ({
  supabaseUrl,
  supabaseAnonKey,
  mode,
}: SupabaseEnvConfig) => {
  if (supabaseUrl && supabaseAnonKey) {
    return createClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  if (mode === "test") {
    return createDummyClient();
  }

  throw new Error("Konfigurasi Supabase belum diatur.");
};

export const supabase = createSupabaseClientFromEnv({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  mode: import.meta.env.MODE,
});
