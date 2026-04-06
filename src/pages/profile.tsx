import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Building2,
  Camera,
  CheckCircle2,
  Globe,
  Instagram,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  Star,
  TrendingUp,
  Twitter,
  Users,
  X,
  Youtube,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import type { Influencer } from "@/types";

// --- Utility Functions ---

function getUserTypeLabel(type: string): string {
  switch (type) {
    case "sme":
      return "Pemilik Bisnis";
    case "influencer":
      return "Influencer";
    default:
      return "Admin";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Aktif";
    case "inactive":
      return "Tidak Aktif";
    default:
      return "Ditangguhkan";
  }
}

function getStatusVariant(status: string): "success" | "warning" | "danger" {
  switch (status) {
    case "active":
      return "success";
    case "inactive":
      return "warning";
    default:
      return "danger";
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const LEADING_AT_SYMBOLS_REGEX = /^@+/;

function normalizeSocialHandle(handle: string): string {
  return handle.trim().replace(LEADING_AT_SYMBOLS_REGEX, "");
}

function formatFollowers(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

// --- Animation Variants ---

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

// --- Sub-Components ---

function VerificationDot({ verified }: { verified: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${verified ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"}`}
      title={verified ? "Terverifikasi" : "Belum Terverifikasi"}
    />
  );
}

function SocialPill({
  icon: Icon,
  href,
  label,
}: {
  icon: typeof Instagram;
  href?: string;
  label: string;
}) {
  if (!href) {
    return null;
  }
  return (
    <a
      className="group inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 transition-all duration-200 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-primary-600 dark:hover:bg-primary-950/40 dark:hover:text-primary-400"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <Icon className="h-4 w-4" />
      <span className="font-medium">{label}</span>
      <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6">
      <span className="w-36 shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <span className="font-medium text-zinc-900 dark:text-zinc-100">
        {children}
      </span>
    </div>
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Existing page orchestrates auth, profile fetch/update, and conditional rendering in one place; safe to keep for now.
export function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [editState, setEditState] = useState({
    isEditing: false,
    error: "",
    success: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    bio: "",
    avatar_url: "",
  });
  const [influencerProfile, setInfluencerProfile] = useState<Influencer | null>(
    null
  );
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("Invalid session");
      }

      const response = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const payload = await response.json();

      setFormData({
        name: payload.data.user.name || "",
        phone: payload.data.user.phone || "",
        bio: payload.data.user.bio || "",
        avatar_url: payload.data.user.avatar_url || "",
      });
      setInfluencerProfile(payload.data.influencerProfile);
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    setEditState({ isEditing: true, error: "", success: "" });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setEditState((prev) => ({ ...prev, error: "Sesi tidak valid." }));
        return;
      }

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setEditState((prev) => ({
          ...prev,
          error: payload?.message || "Gagal menyimpan.",
        }));
        return;
      }

      setEditState({
        isEditing: false,
        error: "",
        success: "Profil diperbarui.",
      });
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = setTimeout(
        () => setEditState((prev) => ({ ...prev, success: "" })),
        3000
      );
    } catch {
      setEditState((prev) => ({ ...prev, error: "Terjadi kesalahan." }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch {
      console.error("Error logging out");
    }
  };

  if (!user) {
    return null;
  }

  const isInfluencer = user.user_type === "influencer";

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Status toast */}
      <AnimatePresence>
        {(editState.success || editState.error) && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-20 right-6 z-50"
            exit={{ opacity: 0, y: -12 }}
            initial={{ opacity: 0, y: -12 }}
          >
            <div
              className={`flex items-center gap-3 rounded-xl px-5 py-3 shadow-lg ${
                editState.success
                  ? "bg-emerald-600 text-white"
                  : "bg-rose-600 text-white"
              }`}
            >
              {editState.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
              <p className="font-medium text-sm">
                {editState.success || editState.error}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate="show"
        className="mx-auto max-w-4xl px-6 pt-12 pb-24 lg:px-8"
        initial="hidden"
        variants={stagger}
      >
        {/* ── Top section: avatar + identity ── */}
        <motion.header
          className="flex flex-col gap-8 md:flex-row md:items-start md:gap-10"
          variants={fadeUp}
        >
          {/* Avatar */}
          <div className="group relative shrink-0">
            <div className="h-28 w-28 overflow-hidden rounded-3xl bg-zinc-100 ring-1 ring-zinc-200/60 dark:bg-zinc-800 dark:ring-zinc-700/60">
              {formData.avatar_url ? (
                <img
                  alt={user.name}
                  className="h-full w-full object-cover"
                  height={112}
                  src={formData.avatar_url}
                  width={112}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800">
                  <span className="font-bold font-display text-3xl text-primary-700 dark:text-primary-300">
                    {user.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            {editState.isEditing && (
              <button
                className="absolute -right-2 -bottom-2 rounded-xl bg-zinc-900 p-2 text-white shadow-md transition-transform hover:scale-105 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900"
                type="button"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Identity + actions */}
          <div className="flex-1">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                {editState.isEditing ? (
                  <input
                    className="w-full border-0 border-primary-400 border-b-2 bg-transparent pb-1 font-bold font-display text-3xl tracking-tight outline-none placeholder:text-zinc-400 dark:border-primary-500 dark:text-white"
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Nama Anda"
                    type="text"
                    value={formData.name}
                  />
                ) : (
                  <h1 className="font-bold font-display text-3xl text-zinc-900 tracking-tight dark:text-white">
                    {user.name}
                  </h1>
                )}

                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1 font-medium text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {user.user_type === "sme" ? (
                      <Building2 className="h-3.5 w-3.5" />
                    ) : (
                      <Star className="h-3.5 w-3.5" />
                    )}
                    {getUserTypeLabel(user.user_type)}
                  </span>
                  <VerificationDot verified={user.email_verified} />
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    Bergabung {formatDate(user.created_at)}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {editState.isEditing ? (
                  <>
                    <button
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      onClick={() =>
                        setEditState((prev) => ({ ...prev, isEditing: false }))
                      }
                      type="button"
                    >
                      Batal
                    </button>
                    <button
                      className="btn-primary !rounded-xl !px-5 !py-2 !text-sm inline-flex items-center gap-2"
                      disabled={isLoading}
                      onClick={handleSave}
                      type="button"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {isLoading ? "Menyimpan..." : "Simpan"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 font-medium text-sm text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-700"
                      onClick={() =>
                        setEditState((prev) => ({ ...prev, isEditing: true }))
                      }
                      type="button"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit Profil
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-rose-600 dark:hover:text-rose-400"
                      onClick={handleLogout}
                      type="button"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Bio */}
            <div className="mt-5 max-w-xl">
              {editState.isEditing ? (
                <textarea
                  className="input-field !rounded-xl !py-3 min-h-[80px] resize-none text-sm"
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  placeholder="Ceritakan sedikit tentang diri Anda..."
                  value={formData.bio}
                />
              ) : (
                <p className="text-zinc-600 leading-relaxed dark:text-zinc-400">
                  {user.bio || "Belum ada bio."}
                </p>
              )}
            </div>

            {/* Social links for influencer */}
            {isInfluencer && influencerProfile && (
              <div className="mt-5 flex flex-wrap gap-2">
                <SocialPill
                  href={
                    influencerProfile.instagram_handle
                      ? `https://instagram.com/${normalizeSocialHandle(influencerProfile.instagram_handle)}`
                      : undefined
                  }
                  icon={Instagram}
                  label="Instagram"
                />
                <SocialPill
                  href={
                    influencerProfile.twitter_handle
                      ? `https://twitter.com/${normalizeSocialHandle(influencerProfile.twitter_handle)}`
                      : undefined
                  }
                  icon={Twitter}
                  label="Twitter"
                />
                <SocialPill
                  href={
                    influencerProfile.youtube_handle
                      ? `https://youtube.com/${influencerProfile.youtube_handle}`
                      : undefined
                  }
                  icon={Youtube}
                  label="YouTube"
                />
                <SocialPill
                  href={influencerProfile.portfolio_url}
                  icon={Globe}
                  label="Portfolio"
                />
              </div>
            )}
          </div>
        </motion.header>

        {/* ── Stats strip (influencer only) ── */}
        {isInfluencer && influencerProfile && (
          <motion.div
            className="mt-12 grid grid-cols-3 divide-x divide-zinc-200 rounded-2xl border border-zinc-200 bg-zinc-50/50 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/50"
            variants={fadeUp}
          >
            <div className="px-6 py-5 text-center">
              <div className="flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400">
                <Users className="h-4 w-4" />
                <span className="font-medium text-xs uppercase tracking-wider">
                  Pengikut
                </span>
              </div>
              <p className="mt-1 font-bold font-display text-2xl text-zinc-900 tracking-tight dark:text-white">
                {formatFollowers(influencerProfile.followers_count)}
              </p>
            </div>
            <div className="px-6 py-5 text-center">
              <div className="flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium text-xs uppercase tracking-wider">
                  Engagement
                </span>
              </div>
              <p className="mt-1 font-bold font-display text-2xl text-zinc-900 tracking-tight dark:text-white">
                {influencerProfile.engagement_rate}%
              </p>
            </div>
            <div className="px-6 py-5 text-center">
              <div className="flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400">
                <span className="font-medium text-xs uppercase tracking-wider">
                  Harga/Post
                </span>
              </div>
              <p className="mt-1 font-bold font-display text-2xl text-zinc-900 tracking-tight dark:text-white">
                Rp {influencerProfile.price_per_post.toLocaleString("id-ID")}
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Divider ── */}
        <motion.div
          className="my-12 h-px bg-zinc-200 dark:bg-zinc-800"
          variants={fadeUp}
        />

        {/* ── Detail sections ── */}
        <motion.div
          className="grid grid-cols-1 gap-16 lg:grid-cols-5"
          variants={fadeUp}
        >
          {/* Left column — Contact info */}
          <section className="space-y-8 lg:col-span-3">
            <h2 className="flex items-center gap-2 font-display font-semibold text-sm text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
              <Mail className="h-4 w-4" />
              Informasi Kontak
            </h2>

            <div className="space-y-5">
              <InfoRow label="Email">
                <span className="flex items-center gap-2">
                  {user.email}
                  {user.email_verified && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                </span>
              </InfoRow>

              <InfoRow label="Telepon">
                {editState.isEditing ? (
                  <input
                    className="input-field !rounded-lg !px-3 !py-2 !text-sm max-w-xs"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="+62..."
                    type="tel"
                    value={formData.phone}
                  />
                ) : (
                  <span className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-zinc-400" />
                    {user.phone || "Belum diatur"}
                  </span>
                )}
              </InfoRow>

              {isInfluencer && influencerProfile && (
                <InfoRow label="Lokasi">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-zinc-400" />
                    {influencerProfile.location}
                  </span>
                </InfoRow>
              )}
            </div>
          </section>

          {/* Right column — Account status */}
          <section className="space-y-8 lg:col-span-2">
            <h2 className="flex items-center gap-2 font-display font-semibold text-sm text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
              <ShieldCheck className="h-4 w-4" />
              Status Akun
            </h2>

            <div className="space-y-4">
              <StatusRow
                label="Status"
                value={getStatusLabel(user.status)}
                variant={getStatusVariant(user.status)}
              />
              <StatusRow
                label="Email"
                value={
                  user.email_verified ? "Terverifikasi" : "Belum Terverifikasi"
                }
                variant={user.email_verified ? "success" : "warning"}
              />
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Login Terakhir
                </span>
                <span className="font-medium text-sm text-zinc-900 dark:text-zinc-200">
                  {user.last_login_at
                    ? formatDate(user.last_login_at)
                    : "Belum pernah"}
                </span>
              </div>
            </div>
          </section>
        </motion.div>
      </motion.div>
    </div>
  );
}

// --- Small helper ---

function StatusRow({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: "success" | "warning" | "danger";
}) {
  const dotColor = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
  }[variant];

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="inline-flex items-center gap-2 font-medium text-sm text-zinc-900 dark:text-zinc-200">
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
        {value}
      </span>
    </div>
  );
}
