import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Camera,
  CheckCircle2,
  Globe,
  Instagram,
  Mail,
  MapPin,
  ShieldCheck,
  Star,
  Twitter,
  Youtube,
  Sparkles,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
        colorClass = "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400";
        label = "Aktif";
        break;
      case "inactive":
        colorClass = "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400";
        label = "Tidak Aktif";
        break;
      default:
        colorClass = "text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400";
        label = "Ditangguhkan";
        break;
    }
  } else {
    switch (status) {
      case "verified":
        colorClass = "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400";
        label = "Terverifikasi";
        break;
      case "pending":
        colorClass = "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400";
        label = "Menunggu";
        break;
      default:
        colorClass = "text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400";
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="group relative overflow-hidden bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 transition-all hover:border-zinc-200 dark:hover:border-zinc-700"
    >
      <div className="flex flex-col">
        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{label}</span>
        <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white font-display">
          {value}
        </span>
        {subtext && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 font-medium tracking-wide uppercase">
            {subtext}
          </span>
        )}
      </div>
      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <Sparkles className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
      </div>
    </motion.div>
  );
}

function SocialLink({ icon: Icon, href }: { icon: any; href?: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
    >
      <Icon className="w-5 h-5" />
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
  const [influencerProfile, setInfluencerProfile] = useState<Influencer | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Invalid session");

      const response = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) throw new Error("Failed to fetch profile");

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
      setTimeout(() => setEditState(prev => ({ ...prev, success: "" })), 3000);
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

  if (!user) return null;

  const isInfluencer = user.user_type === "influencer";

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black">
      {/* Decorative Header Background */}
      <div className="h-48 w-full bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:16px_16px] opacity-50" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10 pb-20">
        
        {/* Main Profile Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6 mb-12">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative group"
          >
            <div className="h-32 w-32 md:h-40 md:w-40 rounded-full border-4 border-white dark:border-black shadow-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
              {formData.avatar_url ? (
                <img
                  src={formData.avatar_url}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-zinc-300 dark:text-zinc-600">
                   <span className="text-4xl font-bold">{user.name.charAt(0)}</span>
                </div>
              )}
            </div>
            {editState.isEditing && (
              <button className="absolute bottom-2 right-2 p-2 bg-zinc-900 text-white rounded-full shadow-lg hover:bg-black transition-colors">
                <Camera className="w-4 h-4" />
              </button>
            )}
          </motion.div>

          <div className="flex-1 w-full md:mb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                {editState.isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="text-3xl font-bold bg-transparent border-b-2 border-zinc-200 focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-white outline-none pb-1 w-full md:w-auto dark:text-white"
                    placeholder="Nama Anda"
                  />
                ) : (
                  <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white tracking-tight font-display">
                    {user.name}
                  </h1>
                )}
                
                <div className="flex items-center gap-3 mt-2 text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {user.user_type === "sme" ? (
                      <Building2 className="w-4 h-4" />
                    ) : (
                      <Star className="w-4 h-4" />
                    )}
                    {getUserTypeLabel(user.user_type)}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <span className="text-sm">{user.email}</span>
                </div>
              </div>

              <div className="flex gap-3">
                 {!editState.isEditing ? (
                    <button
                      onClick={() => setEditState(prev => ({ ...prev, isEditing: true }))}
                      className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-zinc-900 dark:text-white"
                    >
                      Edit Profil
                    </button>
                 ) : (
                    <>
                      <button
                        onClick={() => setEditState(prev => ({ ...prev, isEditing: false }))}
                        className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-sm font-medium transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-black dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
                      >
                        {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
                      </button>
                    </>
                 )}
                 <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-800"
                  >
                    Keluar
                  </button>
              </div>
            </div>

            {/* Bio Section */}
            <div className="mt-6 max-w-2xl">
              {editState.isEditing ? (
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  className="w-full h-24 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none resize-none dark:text-zinc-300"
                  placeholder="Ceritakan sedikit tentang diri Anda..."
                />
              ) : (
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {user.bio || "Belum ada bio."}
                </p>
              )}
            </div>

            {/* Social Links for Influencer */}
            {isInfluencer && influencerProfile && (
               <div className="flex gap-1 mt-4">
                  <SocialLink icon={Instagram} href={influencerProfile.instagram_handle ? `https://instagram.com/${influencerProfile.instagram_handle}` : undefined} />
                  <SocialLink icon={Twitter} href={influencerProfile.twitter_handle ? `https://twitter.com/${influencerProfile.twitter_handle}` : undefined} />
                  <SocialLink icon={Youtube} href={influencerProfile.youtube_handle ? `https://youtube.com/${influencerProfile.youtube_handle}` : undefined} />
                  <SocialLink icon={Globe} href={influencerProfile.portfolio_url} />
               </div>
            )}
          </div>
        </div>

        {/* Status Messages */}
        <AnimatePresence>
          {(editState.success || editState.error) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className={`p-4 rounded-lg flex items-center gap-3 ${editState.success ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200' : 'bg-rose-50 text-rose-900 dark:bg-rose-900/20 dark:text-rose-200'}`}>
                {editState.success ? <CheckCircle2 className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                <p className="font-medium text-sm">{editState.success || editState.error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Grid (Influencer Only) */}
        {isInfluencer && influencerProfile && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <StatItem
              label="Pengikut"
              value={influencerProfile.followers_count.toLocaleString()}
              subtext="Total Audience"
              delay={0.1}
            />
            <StatItem
              label="Engagement Rate"
              value={`${influencerProfile.engagement_rate}%`}
              subtext="Average"
              delay={0.2}
            />
            <StatItem
              label="Rate Card"
              value={`Rp ${influencerProfile.price_per_post.toLocaleString("id-ID")}`}
              subtext="Mulai Dari"
              delay={0.3}
            />
          </div>
        )}

        {/* Detailed Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 border-t border-zinc-200 dark:border-zinc-800 pt-12">
          
          {/* Contact Info */}
          <section>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Informasi Kontak
            </h3>
            <div className="space-y-6">
              <div className="group">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">Email</span>
                <div className="text-zinc-900 dark:text-zinc-200 font-medium flex items-center justify-between">
                  {user.email}
                  {user.email_verified && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </div>
              </div>
              
              <div className="group">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">Telepon</span>
                {editState.isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none dark:text-white"
                    placeholder="+62..."
                  />
                ) : (
                  <div className="text-zinc-900 dark:text-zinc-200 font-medium">
                    {user.phone || "Belum diatur"}
                  </div>
                )}
              </div>

              {isInfluencer && influencerProfile && (
                 <div className="group">
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">Lokasi</span>
                  <div className="text-zinc-900 dark:text-zinc-200 font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-zinc-400" />
                    {influencerProfile.location}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Account Status */}
          <section>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Status Akun
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/50">
                <span className="text-zinc-600 dark:text-zinc-400">Status Akun</span>
                <StatusBadge status={user.status} type="account" />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/50">
                <span className="text-zinc-600 dark:text-zinc-400">Verifikasi Email</span>
                <StatusBadge status={user.email_verified ? "verified" : "pending"} type="verification" />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/50">
                <span className="text-zinc-600 dark:text-zinc-400">Bergabung Sejak</span>
                <span className="text-zinc-900 dark:text-zinc-200 font-medium text-sm">{formatDate(user.created_at)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/50">
                <span className="text-zinc-600 dark:text-zinc-400">Login Terakhir</span>
                <span className="text-zinc-900 dark:text-zinc-200 font-medium text-sm">
                   {user.last_login_at ? formatDate(user.last_login_at) : "Belum pernah"}
                </span>
              </div>
            </div>
          </section>

        </div>

      </div>
    </div>
  );
}
