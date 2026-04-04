import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Profile } from "./profile";

// Mock Supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock Auth Context
vi.mock("@/contexts/auth-context", () => ({
  useAuth: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
  user_type: "sme",
  status: "active",
  email_verified: true,
  created_at: "2023-01-01T00:00:00Z",
  last_login_at: "2023-01-02T00:00:00Z",
  avatar_url: "https://example.com/avatar.jpg",
  bio: "Test Bio",
  phone: "08123456789",
};

const mockInfluencerProfile = {
  id: "inf-123",
  user_id: "user-123",
  followers_count: 10_000,
  engagement_rate: 5.5,
  price_per_post: 500_000,
  location: "Jakarta",
  niche: "Lifestyle",
  verification_status: "verified",
  instagram_handle: "@testcreator",
  twitter_handle: "@testcreator",
};

const FOLLOWER_COUNT_PATTERN = /10[.,]000/;
const RATE_CARD_PATTERN = /500[.,]000/;

const renderProfile = (user = mockUser) => {
  (useAuth as Mock).mockReturnValue({
    user,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  });

  return render(
    <BrowserRouter>
      <Profile />
    </BrowserRouter>
  );
};

describe("Profile Page", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { access_token: "mock-token" } },
    });
  });

  it("renders user profile information", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { user: mockUser, influencerProfile: null },
      }),
    });

    renderProfile();

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeDefined();
      expect(screen.getByText("Pemilik Bisnis")).toBeDefined();
      expect(screen.getAllByText("test@example.com").length).toBeGreaterThan(0);
    });
  });

  it("renders influencer stats for influencer users", async () => {
    const influencerUser = { ...mockUser, user_type: "influencer" };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          user: influencerUser,
          influencerProfile: mockInfluencerProfile,
        },
      }),
    });

    renderProfile(influencerUser);

    await waitFor(() => {
      expect(screen.getByText(FOLLOWER_COUNT_PATTERN)).toBeDefined();
      expect(screen.getByText("5.5%")).toBeDefined();
      expect(screen.getByText(RATE_CARD_PATTERN)).toBeDefined();
      expect(screen.getByText("Pengikut")).toBeDefined();
      expect(screen.getByText("Total Audiens")).toBeDefined();
      expect(screen.getByText("Tingkat Interaksi")).toBeDefined();
      expect(screen.getByText("Rata-rata")).toBeDefined();
      expect(screen.getByText("Harga per Post")).toBeDefined();
      expect(screen.getByText("Mulai Dari")).toBeDefined();
    });
  });

  it("strips leading @ from instagram and twitter social links", async () => {
    const influencerUser = { ...mockUser, user_type: "influencer" };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          user: influencerUser,
          influencerProfile: mockInfluencerProfile,
        },
      }),
    });

    renderProfile(influencerUser);

    await waitFor(() => {
      expect(
        document.querySelector('a[href="https://instagram.com/testcreator"]')
      ).not.toBeNull();
      expect(
        document.querySelector('a[href="https://twitter.com/testcreator"]')
      ).not.toBeNull();
      expect(
        document.querySelector('a[href="https://instagram.com/@testcreator"]')
      ).toBeNull();
      expect(
        document.querySelector('a[href="https://twitter.com/@testcreator"]')
      ).toBeNull();
    });
  });

  it("allows editing profile", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { user: mockUser, influencerProfile: null },
      }),
    });

    renderProfile();

    await waitFor(() => {
      expect(screen.getByText("Edit Profil")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Edit Profil"));

    const nameInput = screen.getByPlaceholderText("Nama Anda");
    fireEvent.change(nameInput, { target: { value: "Updated Name" } });

    expect((nameInput as HTMLInputElement).value).toBe("Updated Name");

    // Mock save response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Success" }),
    });

    fireEvent.click(screen.getByText("Simpan Perubahan"));

    await waitFor(() => {
      expect(screen.getByText("Profil diperbarui.")).toBeDefined();
    });
  });

  it("clears previous success timer before scheduling a new one on rapid saves", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { user: mockUser, influencerProfile: null },
        }),
      })
      // first save
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Success" }),
      })
      // second save
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Success" }),
      });

    renderProfile();

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeDefined();
    });

    // --- first save ---
    fireEvent.click(screen.getByText("Edit Profil"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Nama Anda")).toBeDefined();
    });
    fireEvent.change(screen.getByPlaceholderText("Nama Anda"), {
      target: { value: "Name One" },
    });
    fireEvent.click(screen.getByText("Simpan Perubahan"));

    await waitFor(() => {
      expect(screen.getByText("Profil diperbarui.")).toBeDefined();
    });

    // simulate 2s gap before user re-enters edit mode and saves again
    await new Promise((r) => setTimeout(r, 2000));

    // --- second save ---
    fireEvent.click(screen.getByText("Edit Profil"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Nama Anda")).toBeDefined();
    });
    fireEvent.change(screen.getByPlaceholderText("Nama Anda"), {
      target: { value: "Name Two" },
    });
    fireEvent.click(screen.getByText("Simpan Perubahan"));

    await waitFor(() => {
      expect(screen.getByText("Profil diperbarui.")).toBeDefined();
    });

    // wait 2.5s — first timer (3s from save1) already fired at T=3s,
    // but old timer was cleared; second timer fires at T=5s (3s after save2 at T=2s).
    // At T=4.5s, success message must still be visible.
    await new Promise((r) => setTimeout(r, 2500));

    expect(screen.getByText("Profil diperbarui.")).toBeDefined();
  }, 10_000);
});
