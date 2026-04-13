import {
  createInternalServerError,
  createNodeFunctionLogger,
  emitAndReturn,
} from "../../lib/evlog";

const HEARTBEAT_SECRET = process.env.HEARTBEAT_SECRET ?? "";

interface HeartbeatDependencies {
  pingDatabase: () => Promise<number>;
}

type HeartbeatDependenciesFactory = () => HeartbeatDependencies;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export const createHeartbeatHandler = (deps: {
  secret: string;
  pingDatabase: () => Promise<number>;
}) =>
  async function onRequest(context: { request: Request }) {
    const { request } = context;
    const log = createNodeFunctionLogger(request);
    let response: Response;

    if (request.method !== "GET") {
      response = jsonResponse({ message: "Metode tidak diizinkan." }, 405);
      return emitAndReturn(log, response);
    }

    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token || token !== deps.secret) {
      response = jsonResponse({ message: "Tidak diizinkan." }, 401);
      return emitAndReturn(log, response);
    }

    try {
      const pingMs = await deps.pingDatabase();

      response = jsonResponse(
        {
          status: "ok",
          message: `NanoConnect aktif — DB ping ${pingMs}ms`,
          timestamp: new Date().toISOString(),
        },
        200
      );
      return emitAndReturn(log, response);
    } catch (error) {
      const structuredError = createInternalServerError(
        error,
        "Heartbeat check gagal.",
        "Periksa koneksi database dan pastikan Supabase tidak dalam status paused."
      );
      log.error(structuredError, { action: "heartbeat" });
      response = jsonResponse({ message: structuredError.message }, 500);
      return emitAndReturn(log, response);
    }
  };

const createProductionDependencies: HeartbeatDependenciesFactory = () => {
  return {
    async pingDatabase() {
      const start = Date.now();
      const { createClient } = await import("@supabase/supabase-js");

      const supabaseUrl =
        process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseAnonKey =
        process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

      if (!(supabaseUrl && supabaseAnonKey)) {
        throw new Error("Supabase environment variables belum diatur.");
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
      });

      const { error } = await supabase
        .from("influencers")
        .select("id")
        .limit(1);

      if (error) {
        throw error;
      }

      return Date.now() - start;
    },
  };
};

export const onRequest = createHeartbeatHandler({
  secret: HEARTBEAT_SECRET,
  pingDatabase: createProductionDependencies().pingDatabase,
});
