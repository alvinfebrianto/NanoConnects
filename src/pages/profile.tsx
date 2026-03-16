import {
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  LogOut,
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
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import type { Influencer, User as UserType } from "@/types";

// --- Utility Functions ---

function getUserTypeLabel(type: string): string {
  switch (type) {
    case "sme":
      return "Business Owner";
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
  let Icon = ShieldCheck;

  if (type === "account") {
    switch (status) {
      case "active":
        colorClass =
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30";
        label = "Active";
        break;
      case "inactive":
        colorClass =
          "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30";
        label = "Inactive";
        break;
      default:
        colorClass =
          "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30";
        label = "Suspended";
        break;
    }
  } else {
    switch (status) {
      case "verified":
        colorClass =
          "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30";
        label = "Verified";
        break;
      case "pending":
        colorClass =
          "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30";
        label = "Pending";
        break;
      default:
        colorClass =
          "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700";
        label = "Unverified";
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
  icon: any;
  label: string;
  value: string | number;
  subtext?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm transition-all hover:shadow-md dark:bg-zinc-900"
    >
      <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-gradient-to-br from-primary-500/10 to-transparent transition-transform group-hover:scale-110" />
      
      <div className="relative flex items-start justify-between">
        <div>
          <p className="font-medium text-sm text-zinc-500 dark:text-zinc-400">
            {label}
          </p>
          <h3 className="mt-2 font-display font-bold text-2xl text-zinc-900 dark:text-white">
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

function MenuLink({
  to,
  icon: Icon,
  title,
  description,
  colorClass = "bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400",
}: {
  to: string;
  icon: any;
  title: string;
  description: string;
  colorClass?: string;
}) {
  return (
    <Link
      to={to}
      className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm transition-all hover:border-primary-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-primary-900"
    >
      <div
        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${colorClass}`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-zinc-900 transition-colors group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
          {title}
        </h4>
        <p className="line-clamp-1 text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 text-zinc-300 transition-transform group-hover:translate-x-1 dark:text-zinc-600" />
    </Link>
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
    if (!user) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Invalid session");

      const response = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (!response.ok) throw new Error("Failed to fetch profile");
      
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
        const payload = (await response.json());
        throw new Error(payload.message || "Gagal menyimpan perubahan.");
      }

      setEditState({
        isEditing: false,
        error: "",
        success: "Profil berhasil diperbarui!",
      });
    } catch (err: any) {
      setEditState((prev) => ({
        ...prev,
        error: err.message || "Terjadi kesalahan.",
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

  if (!user) return null;

  const isInfluencer = user.user_type === "influencer";

  return (
    <div className="min-h-screen bg-zinc-50/50 py-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header / Breadcrumb area could go here */}
        
        <div className="grid gap-6 lg:grid-cols-12">
          
          {/* LEFT COLUMN - Profile Card */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-4 xl:col-span-3"
          >
            <div className="sticky top-24 space-y-6">
              <div className="overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white shadow-lg dark:border-zinc-800">
                      {formData.avatar_url ? (
                        <img
                          src={formData.avatar_url}
                          alt={user.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                          <UserIcon className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
                        </div>
                      )}
                    </div>
                    {editState.isEditing && (
                      <button className="absolute bottom-0 right-0 rounded-full bg-primary-600 p-2 text-white shadow-lg hover:bg-primary-700">
                        <Camera className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {editState.isEditing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="mb-2 w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-center font-bold text-lg focus:border-primary-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      placeholder="Your Name"
                    />
                  ) : (
                    <h2 className="mb-1 font-display font-bold text-2xl text-zinc-900 dark:text-white">
                      {user.name}
                    </h2>
                  )}

                  <div className="mb-4 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                      {user.user_type === 'sme' ? <Building2 className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
                      {getUserTypeLabel(user.user_type)}
                    </span>
                    {user.email_verified && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
                  </div>

                  {editState.isEditing ? (
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      className="mb-6 h-24 w-full resize-none rounded-lg border border-zinc-200 p-3 text-sm focus:border-primary-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p className="mb-6 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                      {user.bio || "No bio yet."}
                    </p>
                  )}

                  <div className="flex w-full gap-2">
                    {editState.isEditing ? (
                      <>
                        <button
                          onClick={() => setEditState(prev => ({ ...prev, isEditing: false }))}
                          className="flex-1 rounded-xl border border-zinc-200 py-2.5 font-medium text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={isLoading}
                          className="flex-1 rounded-xl bg-primary-600 py-2.5 font-medium text-sm text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
                        >
                          {isLoading ? "Saving..." : "Save"}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setEditState(prev => ({ ...prev, isEditing: true }))}
                        className="flex-1 rounded-xl border border-zinc-200 py-2.5 font-medium text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-2 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl p-3 font-medium text-red-600 text-sm transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </motion.div>

          {/* RIGHT COLUMN - Content */}
          <div className="space-y-6 lg:col-span-8 xl:col-span-9">
            
            {/* Status Messages */}
            {editState.success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-700 text-sm dark:bg-emerald-900/20 dark:text-emerald-400"
              >
                <CheckCircle2 className="h-4 w-4" />
                {editState.success}
              </motion.div>
            )}
            {editState.error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-rose-700 text-sm dark:bg-rose-900/20 dark:text-rose-400"
              >
                <X className="h-4 w-4" />
                {editState.error}
              </motion.div>
            )}

            {/* Stats Grid (Influencer Only) */}
            {isInfluencer && influencerProfile && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                  label="Followers"
                  value={influencerProfile.followers_count.toLocaleString()}
                  icon={Users}
                  delay={0.1}
                />
                <StatCard
                  label="Engagement Rate"
                  value={`${influencerProfile.engagement_rate}%`}
                  icon={Sparkles}
                  delay={0.2}
                />
                <StatCard
                  label="Price per Post"
                  value={`Rp ${(influencerProfile.price_per_post / 1000).toFixed(0)}k`}
                  subtext="Starting from"
                  icon={CreditCard}
                  delay={0.3}
                />
              </div>
            )}

            {/* Menu Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="mb-4 font-semibold text-lg text-zinc-900 dark:text-white">
                Quick Actions
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {user.user_type === "sme" ? (
                  <>
                    <MenuLink
                      to="/influencers"
                      title="Find Influencers"
                      description="Browse and connect with creators"
                      icon={Star}
                      colorClass="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                    />
                    <MenuLink
                      to="/ai-recommendations"
                      title="AI Recommendations"
                      description="Get smart matches for your brand"
                      icon={Sparkles}
                      colorClass="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
                    />
                  </>
                ) : (
                  <>
                    <MenuLink
                      to="/influencers"
                      title="View My Profile"
                      description="See how your profile looks to others"
                      icon={UserIcon}
                    />
                     {/* Add more influencer specific links here later */}
                  </>
                )}
              </div>
            </motion.div>

            {/* Account Details & Contact */}
            <div className="grid gap-6 md:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
              >
                <h3 className="mb-4 font-semibold text-lg text-zinc-900 dark:text-white">
                  Contact Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">
                      Email Address
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
                      Phone Number
                    </label>
                    {editState.isEditing ? (
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        placeholder="+62..."
                      />
                    ) : (
                      <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-200">
                         <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          <Phone className="h-4 w-4" />
                        </div>
                        {user.phone || "Not set"}
                      </div>
                    )}
                  </div>
                  {isInfluencer && influencerProfile && (
                     <div>
                      <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">
                        Location
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
              >
                <h3 className="mb-4 font-semibold text-lg text-zinc-900 dark:text-white">
                  Account Status
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3 last:border-0 last:pb-0 dark:border-zinc-800">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Account Status</span>
                    <StatusBadge status={user.status} type="account" />
                  </div>
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3 last:border-0 last:pb-0 dark:border-zinc-800">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Email Verification</span>
                     <StatusBadge status={user.email_verified ? 'verified' : 'pending'} type="verification" />
                  </div>
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3 last:border-0 last:pb-0 dark:border-zinc-800">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Member Since</span>
                    <span className="font-medium text-sm text-zinc-900 dark:text-zinc-200">
                      {formatDate(user.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3 last:border-0 last:pb-0 dark:border-zinc-800">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Last Login</span>
                    <span className="font-medium text-sm text-zinc-900 dark:text-zinc-200">
                      {user.last_login_at ? formatDate(user.last_login_at) : "Never"}
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
