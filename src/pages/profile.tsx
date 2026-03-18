import { motion } from "framer-motion";
import {
  Building2,
  Camera,
  CheckCircle2,
  CreditCard,
  LogOut,
  type LucideIcon,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import type { Influencer, User as UserType } from "@/types";

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

// --- Components ---

function StatusBadge({
  status,
  type,
}: {
  status: string;
  type: "account" | "verification";
}) {
  let colorClass = "";
  let label = "";
  const Icon = ShieldCheck;

  if (type === "account") {
    switch (status) {
      case "active":
        colorClass =
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30";
        label = "Aktif";
        break;
      case "inactive":
        colorClass =
          "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30";
        label = "Tidak Aktif";
        break;
      default:
        colorClass =
          "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30";
        label = "Ditangguhkan";
        break;
    }
  } else {
    switch (status) {
      case "verified":
        colorClass =
          "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30";
        label = "Terverifikasi";
        break;
      case "pending":
        colorClass =
          "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30";
        label = "Menunggu";
        break;
      default:
        colorClass =
          "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700";
        label = "Belum Terverifikasi";
        break;
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium text-xs ${colorClass}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  delay = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtext?: string;
  delay?: number;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm transition-all hover:shadow-md dark:bg-zinc-900"
      initial={{ opacity: 0, y: 20 }}
      transition={{ delay, duration: 0.4 }}
    >
      <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-gradient-to-br from-primary-500/10 to-transparent transition-transform group-hover:scale-110" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="font-medium text-sm text-zinc-500 dark:text-zinc-400">
            {label}
          </p>
          <h3 className="mt-2 font-bold font-display text-2xl text-zinc-900 dark:text-white">
            {value}
          </h3>
          {subtext && (
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              {subtext}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
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

      const payload = (await response.json()) as {
        data: { user: UserType; influencerProfile: Influencer | null };
      };

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

  const handleSave = async () => {
    setIsLoading(true);
    setEditState({ isEditing: true, error: "", success: "" });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setEditState((prev) => ({
          ...prev,
          error: "Sesi tidak valid. Silakan masuk kembali.",
        }));
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
        const payload = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        setEditState((prev) => ({
          ...prev,
          error: payload?.message || "Gagal menyimpan perubahan.",
        }));
        return;
      }

      setEditState({
        isEditing: false,
        error: "",
        success: "Profil berhasil diperbarui!",
      });
    } catch {
      setEditState((prev) => ({
        ...prev,
        error: "Terjadi kesalahan. Silakan coba lagi.",
      }));
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
    <div className="min-h-screen bg-zinc-50/50 py-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header / Breadcrumb area could go here */}

        <div className="grid gap-6 lg:grid-cols-12">
          {/* LEFT COLUMN - Profile Card */}
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-4 xl:col-span-3"
            initial={{ opacity: 0, x: -20 }}
          >
            <div className="sticky top-24 space-y-6">
              <div className="overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white shadow-lg dark:border-zinc-800">
                      {formData.avatar_url ? (
                        <img
                          alt={user.name}
                          className="h-full w-full object-cover"
                          src={formData.avatar_url}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                          <UserIcon className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
                        </div>
                      )}
                    </div>
                    {editState.isEditing && (
                      <button className="absolute right-0 bottom-0 rounded-full bg-primary-600 p-2 text-white shadow-lg hover:bg-primary-700">
                        <Camera className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {editState.isEditing ? (
                    <input
                      className="mb-2 w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-center font-bold text-lg focus:border-primary-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Nama Anda"
                      type="text"
                      value={formData.name}
                    />
                  ) : (
                    <h2 className="mb-1 font-bold font-display text-2xl text-zinc-900 dark:text-white">
                      {user.name}
                    </h2>
                  )}

                  <div className="mb-4 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                      {user.user_type === "sme" ? (
                        <Building2 className="h-3.5 w-3.5" />
                      ) : (
                        <Star className="h-3.5 w-3.5" />
                      )}
                      {getUserTypeLabel(user.user_type)}
                    </span>
                    {user.email_verified && (
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    )}
                  </div>

                  {editState.isEditing ? (
                    <textarea
                      className="mb-6 h-24 w-full resize-none rounded-lg border border-zinc-200 p-3 text-sm focus:border-primary-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          bio: e.target.value,
                        }))
                      }
                      placeholder="Ceritakan tentang diri Anda..."
                      value={formData.bio}
                    />
                  ) : (
                    <p className="mb-6 text-sm text-zinc-600 leading-relaxed dark:text-zinc-300">
                      {user.bio || "Belum ada bio."}
                    </p>
                  )}

                  <div className="flex w-full gap-2">
                    {editState.isEditing ? (
                      <>
                        <button
                          className="flex-1 rounded-xl border border-zinc-200 py-2.5 font-medium text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          onClick={() =>
                            setEditState((prev) => ({
                              ...prev,
                              isEditing: false,
                            }))
                          }
                        >
                          Batal
                        </button>
                        <button
                          className="flex-1 rounded-xl bg-primary-600 py-2.5 font-medium text-sm text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
                          disabled={isLoading}
                          onClick={handleSave}
                        >
                          {isLoading ? "Menyimpan..." : "Simpan"}
                        </button>
                      </>
                    ) : (
                      <button
                        className="flex-1 rounded-xl border border-zinc-200 py-2.5 font-medium text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        onClick={() =>
                          setEditState((prev) => ({ ...prev, isEditing: true }))
                        }
                      >
                        Edit Profil
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-2 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-2xl p-3 font-medium text-red-600 text-sm transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/10"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Keluar
                </button>
              </div>
            </div>
          </motion.div>

          {/* RIGHT COLUMN - Content */}
          <div className="space-y-6 lg:col-span-8 xl:col-span-9">
            {/* Status Messages */}
            {editState.success && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-700 text-sm dark:bg-emerald-900/20 dark:text-emerald-400"
                initial={{ opacity: 0, y: -10 }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {editState.success}
              </motion.div>
            )}
            {editState.error && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-rose-700 text-sm dark:bg-rose-900/20 dark:text-rose-400"
                initial={{ opacity: 0, y: -10 }}
              >
                <X className="h-4 w-4" />
                {editState.error}
              </motion.div>
            )}

            {/* Stats Grid (Influencer Only) */}
            {isInfluencer && influencerProfile && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                  delay={0.1}
                  icon={Users}
                  label="Pengikut"
                  value={influencerProfile.followers_count.toLocaleString()}
                />
                <StatCard
                  delay={0.2}
                  icon={Sparkles}
                  label="Tingkat Interaksi"
                  value={`${influencerProfile.engagement_rate}%`}
                />
                <StatCard
                  delay={0.3}
                  icon={CreditCard}
                  label="Harga per Post"
                  subtext="Mulai dari"
                  value={`Rp ${influencerProfile.price_per_post.toLocaleString(
                    "id-ID"
                  )}`}
                />
              </div>
            )}


            <div className="grid gap-6 md:grid-cols-2">
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.5 }}
              >
                <h3 className="mb-4 font-semibold text-lg text-zinc-900 dark:text-white">
                  Informasi Kontak
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">
                      Alamat Email
                    </label>
                    <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-200">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      {user.email}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">
                      Nomor Telepon
                    </label>
                    {editState.isEditing ? (
                      <input
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
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
                      <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-200">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          <Phone className="h-4 w-4" />
                        </div>
                        {user.phone || "Belum diatur"}
                      </div>
                    )}
                  </div>
                  {isInfluencer && influencerProfile && (
                    <div>
                      <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">
                        Lokasi
                      </label>
                      <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-200">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          <MapPin className="h-4 w-4" />
                        </div>
                        {influencerProfile.location}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.6 }}
              >
                <h3 className="mb-4 font-semibold text-lg text-zinc-900 dark:text-white">
                  Status Akun
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-zinc-100 border-b pb-3 last:border-0 last:pb-0 dark:border-zinc-800">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      Status Akun
                    </span>
                    <StatusBadge status={user.status} type="account" />
                  </div>
                  <div className="flex items-center justify-between border-zinc-100 border-b pb-3 last:border-0 last:pb-0 dark:border-zinc-800">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      Verifikasi Email
                    </span>
                    <StatusBadge
                      status={user.email_verified ? "verified" : "pending"}
                      type="verification"
                    />
                  </div>
                  <div className="flex items-center justify-between border-zinc-100 border-b pb-3 last:border-0 last:pb-0 dark:border-zinc-800">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      Anggota Sejak
                    </span>
                    <span className="font-medium text-sm text-zinc-900 dark:text-zinc-200">
                      {formatDate(user.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-zinc-100 border-b pb-3 last:border-0 last:pb-0 dark:border-zinc-800">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      Login Terakhir
                    </span>
                    <span className="font-medium text-sm text-zinc-900 dark:text-zinc-200">
                      {user.last_login_at
                        ? formatDate(user.last_login_at)
                        : "Belum pernah"}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
