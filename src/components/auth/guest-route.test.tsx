import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/contexts/auth-context";
import { GuestRoute } from "./guest-route";

vi.mock("@/lib/supabase", () => {
  const sessionRef = { current: null as unknown };
  const userDbRef = { current: null as unknown };
  const getSessionImpl = {
    current: async () => ({
      data: { session: sessionRef.current },
      error: null,
    }),
  };

  return {
    supabase: {
      auth: {
        getSession: vi.fn((...args: unknown[]) =>
          getSessionImpl.current(...(args as []))
        ),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
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
      })),
      __test__: { sessionRef, userDbRef, getSessionImpl },
    },
  };
});

let defaultGetSession: (...args: unknown[]) => Promise<unknown>;
let testRefs: {
  sessionRef: { current: unknown };
  userDbRef: { current: unknown };
  getSessionImpl: { current: (...args: unknown[]) => Promise<unknown> };
};

beforeAll(async () => {
  const mod = await import("@/lib/supabase");
  testRefs = (mod.supabase as unknown as { __test__: typeof testRefs })
    .__test__;
  defaultGetSession = testRefs.getSessionImpl.current;
});

afterEach(() => {
  cleanup();
  testRefs.sessionRef.current = null;
  testRefs.userDbRef.current = null;
  testRefs.getSessionImpl.current = defaultGetSession;
});

function renderGuestRoute() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <Routes>
          <Route
            element={
              <GuestRoute>
                <div>Login Form</div>
              </GuestRoute>
            }
            path="/login"
          />
          <Route element={<div>Home Page</div>} path="/" />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("GuestRoute", () => {
  it("redirects authenticated user away from guest page", async () => {
    testRefs.sessionRef.current = {
      access_token: "token",
      user: { id: "user-1" },
    };
    testRefs.userDbRef.current = {
      id: "user-1",
      name: "Test",
      email: "test@test.com",
      user_type: "sme",
      email_verified: true,
      status: "active",
      created_at: "",
      updated_at: "",
    };

    renderGuestRoute();

    await waitFor(() => {
      expect(screen.getByText("Home Page")).toBeDefined();
    });
    expect(screen.queryByText("Login Form")).toBeNull();
  });

  it("shows children for unauthenticated user", async () => {
    renderGuestRoute();

    await waitFor(() => {
      expect(screen.getByText("Login Form")).toBeDefined();
    });
  });

  it("does not show content while auth state is loading", () => {
    testRefs.getSessionImpl.current = () =>
      new Promise((_resolve) => {
        /* never resolves — keeps isLoading true */
      });

    renderGuestRoute();

    expect(screen.queryByText("Login Form")).toBeNull();
    expect(screen.queryByText("Home Page")).toBeNull();
  });
});
