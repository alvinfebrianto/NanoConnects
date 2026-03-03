import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

describe("fetchProfile", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns user data when session exists", async () => {
    const { supabase } = await import("@/lib/supabase");
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    } as never);

    const expectedUser = {
      id: "u1",
      name: "Test",
      email: "test@test.com",
      user_type: "sme" as const,
      email_verified: true,
      status: "active" as const,
      created_at: "",
      updated_at: "",
    };
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { user: expectedUser } }),
    });

    const { fetchProfile } = await import("./use-profile");
    const result = await fetchProfile();

    expect(result).toEqual(expectedUser);
  });

  it("returns null when no session exists", async () => {
    const { supabase } = await import("@/lib/supabase");
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);

    const { fetchProfile } = await import("./use-profile");
    const result = await fetchProfile();

    expect(result).toBeNull();
  });

  it("throws when API response is not ok", async () => {
    const { supabase } = await import("@/lib/supabase");
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    } as never);

    fetchSpy.mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Error" }),
    });

    const { fetchProfile } = await import("./use-profile");

    await expect(fetchProfile()).rejects.toThrow("Gagal memuat profil SME.");
  });
});
