import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { Profile } from "./profile";
import { useAuth } from "@/contexts/auth-context";
import { BrowserRouter } from "react-router-dom";
import { supabase } from "@/lib/supabase";

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
  followers_count: 10000,
  engagement_rate: 5.5,
  price_per_post: 500000,
  location: "Jakarta",
  niche: "Lifestyle",
  verification_status: "verified",
};

const renderProfile = (user = mockUser) => {
  (useAuth as Mock).mockReturnValue({
    user: user,
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
      expect(screen.getByText("test@example.com")).toBeDefined();
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
      // Use regex to match 10,000 or 10.000
      expect(screen.getByText(/10[.,]000/)).toBeDefined(); // Pengikut
      expect(screen.getByText("5.5%")).toBeDefined(); // Tingkat Interaksi
      expect(screen.getByText(/500k/)).toBeDefined(); // Harga per Post
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
       const buttons = screen.getAllByText("Edit Profil");
       expect(buttons.length).toBeGreaterThan(0);
    });

    const editButtons = screen.getAllByText("Edit Profil");
    fireEvent.click(editButtons[0]);

    const nameInput = screen.getByPlaceholderText("Nama Anda");
    fireEvent.change(nameInput, { target: { value: "Updated Name" } });

    expect(nameInput.closest('input')?.value).toBe("Updated Name");

    // Mock save response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Success" }),
    });

    fireEvent.click(screen.getByText("Simpan"));

    await waitFor(() => {
      expect(screen.getByText("Profil berhasil diperbarui!")).toBeDefined();
    });
  });
});

