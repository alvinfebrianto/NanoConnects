import { describe, expect, it } from "vitest";
import { createHeartbeatHandler } from "./index";

const SECRET = "test-heartbeat-secret";

const makeContext = (url = "https://example.com/api/heartbeat") => ({
  request: new Request(url, { method: "GET" }),
});

describe("heartbeat node function", () => {
  describe("GET /api/heartbeat", () => {
    it("mengembalikan 200 saat token valid dan database responsif", async () => {
      const handler = createHeartbeatHandler({
        secret: SECRET,
        pingDatabase: async () => 42,
      });

      const response = await handler(
        makeContext(`https://example.com/api/heartbeat?token=${SECRET}`)
      );
      const payload = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(payload.status).toBe("ok");
      expect(payload.message).toContain("NanoConnect aktif");
    });

    it("mengembalikan 401 saat token tidak dikirim", async () => {
      const handler = createHeartbeatHandler({
        secret: SECRET,
        pingDatabase: async () => 0,
      });

      const response = await handler(makeContext());

      expect(response.status).toBe(401);
    });

    it("mengembalikan 401 saat token salah", async () => {
      const handler = createHeartbeatHandler({
        secret: SECRET,
        pingDatabase: async () => 0,
      });

      const response = await handler(
        makeContext("https://example.com/api/heartbeat?token=wrong-token")
      );

      expect(response.status).toBe(401);
    });

    it("mengembalikan 405 untuk method selain GET", async () => {
      const handler = createHeartbeatHandler({
        secret: SECRET,
        pingDatabase: async () => 0,
      });

      const response = await handler({
        request: new Request("https://example.com/api/heartbeat", {
          method: "POST",
        }),
      });

      expect(response.status).toBe(405);
    });

    it("mengembalikan 500 saat database error", async () => {
      const handler = createHeartbeatHandler({
        secret: SECRET,
        pingDatabase: () => {
          throw new Error("connection refused");
        },
      });

      const response = await handler(
        makeContext(`https://example.com/api/heartbeat?token=${SECRET}`)
      );

      expect(response.status).toBe(500);
    });
  });
});
