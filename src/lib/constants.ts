/**
 * Application-wide constants
 */

// Filter defaults
export const FILTER_DEFAULTS = {
  NICHE: "Semua Niche",
  LOCATION: "Semua Lokasi",
  MAX_PRICE: 10_000_000,
  VERIFICATION_STATUS: "all" as const,
};

// Filter options
export const NICHES = [
  "Semua Niche",
  "Fashion & Gaya Hidup",
  "Teknologi",
  "Kecantikan & Perawatan Kulit",
  "Kuliner & Makanan",
  "Travel & Petualangan",
  "Fitness & Kesehatan",
  "Gaming",
  "Bisnis & Keuangan",
  "Edukasi",
  "Hiburan",
  "Fotografi",
] as const;

export const LOCATIONS = [
  "Semua Lokasi",
  "Jakarta",
  "Surabaya",
  "Bandung",
  "Medan",
  "Semarang",
  "Makassar",
  "Palembang",
  "Yogyakarta",
  "Bali",
  "Malang",
] as const;

// Validation
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  NAME_MIN_LENGTH: 2,
};

// Pricing
export const PLATFORM_FEE_RATE = 0.1;

// Routes
export const ROUTES = {
  HOME: "/",
  ABOUT: "/about",
  INFLUENCERS: "/influencers",
  AI_RECOMMENDATIONS: "/ai-recommendations",
  LOGIN: "/login",
  REGISTER: "/register",
  PROFILE: "/profile",
  TERMS: "/terms",
  PRIVACY: "/privacy",
} as const;

// Layout
export const HIDE_LAYOUT_ROUTES = [ROUTES.LOGIN, ROUTES.REGISTER] as const;

// Storage keys
export const STORAGE_KEYS = {
  THEME: "nanoconnect-theme",
} as const;

// API
export const API_ENDPOINTS = {
  INFLUENCERS: "/api/influencers/list",
  ORDERS: "/api/orders",
} as const;

// Skeleton loading
export const SKELETON_COUNT = 6;
