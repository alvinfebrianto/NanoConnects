import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Camera,
  CheckCircle2,
  Globe,
  Instagram,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Twitter,
  Youtube,
  Zap,
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

// --- Components ---

function StatusBadge({
  status,
  type,
}: {
  status: string;
  type: "account" | "verification";
}) {
  const isAccount = type === "account";
  let colorClass = "";
  let label = "";

  if (isAccount) {
    switch (status) {
      case "active":
        colorClass =
          "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400";
        label = "Aktif";
        break;
      case "inactive":
        colorClass =
          "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400";
        label = "Tidak Aktif";
        break;
      default:
        colorClass =
          "text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400";
        label = "Ditangguhkan";
        break;
    }
  } else {
    switch (status) {
      case "verified":
        colorClass =
          "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400";
        label = "Terverifikasi";
        break;
      case "pending":
        colorClass =
          "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400";
        label = "Menunggu";
        break;
      default:
        colorClass =
          "text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400";
        label = "Belum Terverifikasi";
        break;
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium text-xs ${colorClass}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

function StatItem({
  label,
  value,
  subtext,
  delay = 0,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  delay?: number;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-2xl border border-zinc-100 bg-white p-6 transition-all hover:border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
      initial={{ opacity: 0, y: 10 }}
      transition={{ delay, duration: 0.4 }}
    >
      <div className="flex flex-col">
        <span className="mb-1 font-medium text-sm text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        <span className="font-bold font-display text-3xl text-zinc-900 tracking-tight dark:text-white">
          {value}
        </span>
        {subtext && (
          <span className="mt-2 font-medium text-xs text-zinc-400 uppercase tracking-wide dark:text-zinc-500">
            {subtext}
          </span>
        )}
      </div>
      <div className="absolute top-0 right-0 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <Sparkles className="h-4 w-4 text-zinc-300 dark:text-zinc-600" />
      </div>
    </motion.div>
  );
}

function SocialLink({ icon: Icon, href }: { icon: LucideIcon; href?: string }) {
  if (!href) {
    return null;
  }
  return (
    <a
      className="p-2 text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-white"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <Icon className="h-5 w-5" />
    </a>
  );
}

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Decorative Header Background */}
      <div className="relative h-48 w-full overflow-hidden border-zinc-200 border-b bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] opacity-50 [background-size:16px_16px] dark:bg-[radial-gradient(#3f3f46_1px,transparent_1px)]" />
      </div>

      <div className="relative z-10 mx-auto -mt-20 max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        {/* Main Profile Header */}
        <div className="mb-12 flex flex-col items-start gap-6 md:flex-row md:items-end">
          <motion.div
            animate={{ scale: 1, opacity: 1 }}
            className="group relative"
            initial={{ scale: 0.9, opacity: 0 }}
          >
            <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-zinc-100 shadow-xl md:h-40 md:w-40 dark:border-black dark:bg-zinc-800">
              {formData.avatar_url ? (
                <img
                  alt={user.name}
                  className="h-full w-full object-cover"
                  src={formData.avatar_url}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-600">
                  <span className="font-bold text-4xl">
                    {user.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            {editState.isEditing && (
              <button className="absolute right-2 bottom-2 rounded-full bg-zinc-900 p-2 text-white shadow-lg transition-colors hover:bg-black">
                <Camera className="h-4 w-4" />
              </button>
            )}
          </motion.div>

          <div className="w-full flex-1 md:mb-4">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                {editState.isEditing ? (
                  <input
                    className="w-full border-zinc-200 border-b-2 bg-transparent pb-1 font-bold text-3xl outline-none focus:border-zinc-900 md:w-auto dark:border-zinc-700 dark:text-white dark:focus:border-white"
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Nama Anda"
                    type="text"
                    value={formData.name}
                  />
                ) : (
                  <h1 className="font-bold font-display text-3xl text-zinc-900 tracking-tight md:text-4xl dark:text-white">
                    {user.name}
                  </h1>
                )}

                <div className="mt-2 flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1.5 font-medium text-sm">
                    {user.user_type === "sme" ? (
                      <Building2 className="h-4 w-4" />
                    ) : (
                      <Star className="h-4 w-4" />
                    )}
                    {getUserTypeLabel(user.user_type)}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <span className="text-sm">{user.email}</span>
                </div>
              </div>

              <div className="flex gap-3">
                {editState.isEditing ? (
                  <>
                    <button
                      className="px-4 py-2 font-medium text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                      onClick={() =>
                        setEditState((prev) => ({ ...prev, isEditing: false }))
                      }
                    >
                      Batal
                    </button>
                    <button
                      className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-black disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                      disabled={isLoading}
                      onClick={handleSave}
                    >
                      {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                  </>
                ) : (
                  <button
                    className="rounded-lg border border-zinc-200 bg-white px-4 py-2 font-medium text-sm text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
                    onClick={() =>
                      setEditState((prev) => ({ ...prev, isEditing: true }))
                    }
                  >
                    Edit Profil
                  </button>
                )}
                <button
                  className="rounded-lg border border-transparent px-4 py-2 font-medium text-rose-600 text-sm transition-colors hover:border-rose-100 hover:bg-rose-50 dark:hover:border-rose-800 dark:hover:bg-rose-900/20"
                  onClick={handleLogout}
                >
                  Keluar
                </button>
              </div>
            </div>

            {/* Bio Section */}
            <div className="mt-6 max-w-2xl">
              {editState.isEditing ? (
                <textarea
                  className="h-24 w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:focus:ring-white"
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

            {/* Social Links for Influencer */}
            {isInfluencer && influencerProfile && (
              <div className="mt-4 flex gap-1">
                <SocialLink
                  href={
                    influencerProfile.instagram_handle
                      ? `https://instagram.com/${normalizeSocialHandle(influencerProfile.instagram_handle)}`
                      : undefined
                  }
                  icon={Instagram}
                />
                <SocialLink
                  href={
                    influencerProfile.twitter_handle
                      ? `https://twitter.com/${normalizeSocialHandle(influencerProfile.twitter_handle)}`
                      : undefined
                  }
                  icon={Twitter}
                />
                <SocialLink
                  href={
                    influencerProfile.youtube_handle
                      ? `https://youtube.com/${influencerProfile.youtube_handle}`
                      : undefined
                  }
                  icon={Youtube}
                />
                <SocialLink
                  href={influencerProfile.portfolio_url}
                  icon={Globe}
                />
              </div>
            )}
          </div>
        </div>

        {/* Status Messages */}
        <AnimatePresence>
          {(editState.success || editState.error) && (
            <motion.div
              animate={{ opacity: 1, height: "auto" }}
              className="mb-8 overflow-hidden"
              exit={{ opacity: 0, height: 0 }}
              initial={{ opacity: 0, height: 0 }}
            >
              <div
                className={`flex items-center gap-3 rounded-lg p-4 ${editState.success ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200" : "bg-rose-50 text-rose-900 dark:bg-rose-900/20 dark:text-rose-200"}`}
              >
                {editState.success ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Zap className="h-5 w-5" />
                )}
                <p className="font-medium text-sm">
                  {editState.success || editState.error}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Grid (Influencer Only) */}
        {isInfluencer && influencerProfile && (
          <div className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatItem
              delay={0.1}
              label="Pengikut"
              subtext="Total Audiens"
              value={influencerProfile.followers_count.toLocaleString()}
            />
            <StatItem
              delay={0.2}
              label="Tingkat Interaksi"
              subtext="Rata-rata"
              value={`${influencerProfile.engagement_rate}%`}
            />
            <StatItem
              delay={0.3}
              label="Harga per Post"
              subtext="Mulai Dari"
              value={`Rp ${influencerProfile.price_per_post.toLocaleString("id-ID")}`}
            />
          </div>
        )}

        {/* Detailed Info Grid */}
        <div className="grid grid-cols-1 gap-12 border-zinc-200 border-t pt-12 lg:grid-cols-2 dark:border-zinc-800">
          {/* Contact Info */}
          <section>
            <h3 className="mb-6 flex items-center gap-2 font-semibold text-lg text-zinc-900 dark:text-white">
              <Mail className="h-4 w-4" />
              Informasi Kontak
            </h3>
            <div className="space-y-6">
              <div className="group">
                <span className="mb-1 block font-medium text-xs text-zinc-500 uppercase tracking-wider">
                  Email
                </span>
                <div className="flex items-center justify-between font-medium text-zinc-900 dark:text-zinc-200">
                  {user.email}
                  {user.email_verified && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                </div>
              </div>

              <div className="group">
                <span className="mb-1 block font-medium text-xs text-zinc-500 uppercase tracking-wider">
                  Telepon
                </span>
                {editState.isEditing ? (
                  <input
                    className="w-full rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:ring-white"
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
                  <div className="font-medium text-zinc-900 dark:text-zinc-200">
                    {user.phone || "Belum diatur"}
                  </div>
                )}
              </div>

              {isInfluencer && influencerProfile && (
                <div className="group">
                  <span className="mb-1 block font-medium text-xs text-zinc-500 uppercase tracking-wider">
                    Lokasi
                  </span>
                  <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-200">
                    <MapPin className="h-4 w-4 text-zinc-400" />
                    {influencerProfile.location}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Account Status */}
          <section>
            <h3 className="mb-6 flex items-center gap-2 font-semibold text-lg text-zinc-900 dark:text-white">
              <ShieldCheck className="h-4 w-4" />
              Status Akun
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between border-zinc-100 border-b py-2 dark:border-zinc-800/50">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Status Akun
                </span>
                <StatusBadge status={user.status} type="account" />
              </div>
              <div className="flex items-center justify-between border-zinc-100 border-b py-2 dark:border-zinc-800/50">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Verifikasi Email
                </span>
                <StatusBadge
                  status={user.email_verified ? "verified" : "pending"}
                  type="verification"
                />
              </div>
              <div className="flex items-center justify-between border-zinc-100 border-b py-2 dark:border-zinc-800/50">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Bergabung Sejak
                </span>
                <span className="font-medium text-sm text-zinc-900 dark:text-zinc-200">
                  {formatDate(user.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between border-zinc-100 border-b py-2 dark:border-zinc-800/50">
                <span className="text-zinc-600 dark:text-zinc-400">
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
        </div>
      </div>
    </div>
  );
}
