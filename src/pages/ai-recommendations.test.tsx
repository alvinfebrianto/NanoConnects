import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/contexts/auth-context";
import { AIRecommendations } from "@/pages/ai-recommendations";

const sessionRef = { current: null as unknown };
const userDbRef = { current: null as unknown };

vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn(async () => ({
          data: { session: sessionRef.current },
          error: null,
        })),
        onAuthStateChange: vi.fn((_cb: unknown) => ({
          data: {
            subscription: { unsubscribe: vi.fn() },
          },
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: userDbRef.current,
              error: userDbRef.current ? null : { code: "PGRST116" },
            })),
            order: vi.fn(() => ({
              limit: vi.fn(() => ({ data: [], error: null })),
            })),
          })),
          order: vi.fn(() => ({
            limit: vi.fn(() => ({ data: [], error: null })),
          })),
        })),
        insert: vi.fn(async () => ({ error: null })),
      })),
    },
  };
});

const BANGUN_BRIEF_REGEX = /Bangun brief kampanye/i;
const FORM_BRIEF_REGEX = /Form Brief Kampanye/i;
const KIRIM_BRIEF_REGEX = /Kirim Brief Kampanye/i;
const AKUN_BELUM_SME_REGEX = /Akun belum SME/i;
const INDUSTRI_NICHE_REGEX = /Industri atau niche SME/i;
const BUDGET_REGEX = /Budget kampanye/i;

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function renderWithProviders(
  initialEntries: string[] = ["/ai-recommendations"]
) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <AuthProvider>
          <Routes>
            <Route element={<AIRecommendations />} path="/ai-recommendations" />
            <Route element={<div>Login Page</div>} path="/login" />
            <Route element={<div>Home Page</div>} path="/" />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  sessionRef.current = null;
  userDbRef.current = null;

  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Not found" }),
    })
  );
});

describe("AIRecommendations page", () => {
  describe("unauthenticated user", () => {
    it("redirects to login page", async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText("Login Page")).toBeDefined();
      });
    });
  });

  describe("authenticated non-SME user", () => {
    it("shows form with disabled submit and 'Akun belum SME' label", async () => {
      sessionRef.current = {
        access_token: "test-token",
        user: { id: "user-inf-1" },
      };
      userDbRef.current = {
        id: "user-inf-1",
        name: "Influencer User",
        email: "influencer@test.com",
        user_type: "influencer",
        email_verified: true,
        status: "active",
        created_at: "",
        updated_at: "",
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            data: {
              user: {
                id: "user-inf-1",
                name: "Influencer User",
                email: "influencer@test.com",
                user_type: "influencer",
                email_verified: true,
                status: "active",
                created_at: "",
                updated_at: "",
              },
            },
          }),
        })
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText(AKUN_BELUM_SME_REGEX)).toBeDefined();
      });

      expect(screen.getByText(BANGUN_BRIEF_REGEX)).toBeDefined();
      expect(screen.getByText(FORM_BRIEF_REGEX)).toBeDefined();

      const submitButton = screen.getByRole("button", {
        name: KIRIM_BRIEF_REGEX,
      });
      expect(submitButton).toHaveProperty("disabled", true);
    });
  });

  describe("authenticated SME user", () => {
    it("shows form with accessible fields", async () => {
      sessionRef.current = {
        access_token: "test-token",
        user: { id: "user-sme-1" },
      };
      userDbRef.current = {
        id: "user-sme-1",
        name: "SME User",
        email: "sme@test.com",
        user_type: "sme",
        email_verified: true,
        status: "active",
        created_at: "",
        updated_at: "",
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            data: {
              user: {
                id: "user-sme-1",
                name: "SME User",
                email: "sme@test.com",
                user_type: "sme",
                email_verified: true,
                status: "active",
                created_at: "",
                updated_at: "",
              },
            },
          }),
        })
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByLabelText(INDUSTRI_NICHE_REGEX)).toHaveProperty(
          "disabled",
          false
        );
      });

      expect(screen.getByText(BANGUN_BRIEF_REGEX)).toBeDefined();
      expect(screen.getByText(FORM_BRIEF_REGEX)).toBeDefined();

      const budgetInput = screen.getByLabelText(BUDGET_REGEX);
      expect(budgetInput).toHaveProperty("disabled", false);
    });
  });
});
