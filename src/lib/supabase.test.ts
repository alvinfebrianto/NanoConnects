import { describe, expect, it, vi } from "vitest";
import { createSupabaseClientFromEnv } from "./supabase";

describe("createSupabaseClientFromEnv", () => {
  it("mengizinkan dummy client hanya pada mode test", async () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    const client = createSupabaseClientFromEnv({
      supabaseUrl: undefined,
      supabaseAnonKey: undefined,
      mode: "test",
    });

    const sessionResult = await client.auth.getSession();
    expect(sessionResult.data.session).toBeNull();

    warnSpy.mockRestore();
  });

  it("melempar error saat env Supabase tidak lengkap di luar mode test", () => {
    expect(() =>
      createSupabaseClientFromEnv({
        supabaseUrl: undefined,
        supabaseAnonKey: undefined,
        mode: "production",
      })
    ).toThrow("Konfigurasi Supabase belum diatur.");
  });
});
