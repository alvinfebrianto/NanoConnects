import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
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
};

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
        data: { user: influencerUser, influencerProfile: mockInfluencerProfile },
      }),
    });

    renderProfile(influencerUser);

    await waitFor(() => {
      expect(screen.getByText(/10[.,]000/)).toBeDefined();
      expect(screen.getByText("5.5%")).toBeDefined();
      expect(screen.getByText(/500[.,]000/)).toBeDefined();
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
});
