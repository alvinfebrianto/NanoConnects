import {
  ArrowLeft,
  Calendar,
  ChatCircle,
  CheckCircle,
  Globe,
  InstagramLogo,
  MapPin,
  Spinner,
  Star,
  Users,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { useInfluencer } from "@/hooks/use-influencer";
import type { Influencer } from "@/types";

const formatNumber = (num: number): string => {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

export function calculateOrderPricing(pricePerPost: number) {
  const platformFee = pricePerPost * 0.1;
  const total = pricePerPost + platformFee;
  return { basePrice: pricePerPost, platformFee, total };
}

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 20 },
  },
};

function InfluencerSummaryCard({ influencer }: { influencer: Influencer }) {
  return (
    <motion.div
      className="relative mb-8 overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] ring-1 ring-zinc-200/50 dark:bg-zinc-900 dark:ring-zinc-800"
      variants={fadeUpItem}
    >
      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        <motion.div
          className="relative h-40 w-40 shrink-0 overflow-hidden rounded-[2rem]"
          layoutId={`avatar-${influencer.id}`}
        >
          <img
            alt={influencer.user?.name}
            className="h-full w-full object-cover"
            height={160}
            src={
              influencer.user?.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${influencer.id}`
            }
            width={160}
          />
        </motion.div>

        <div className="flex-1">
          <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="flex items-center font-bold font-display text-4xl text-zinc-900 tracking-tight dark:text-white">
                {influencer.user?.name}
                {influencer.verification_status === "verified" && (
                  <CheckCircle
                    className="ml-3 h-8 w-8 text-blue-500"
                    weight="fill"
                  />
                )}
              </h1>
              <p className="mt-2 font-medium text-lg text-primary-600 dark:text-primary-400">
                {influencer.niche}
              </p>
            </div>
          </div>

          <p className="mb-8 max-w-2xl text-zinc-600 leading-relaxed dark:text-zinc-400">
            {influencer.user?.bio || "Kreator ini belum menambahkan bio."}
          </p>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center space-x-2 font-medium text-sm text-zinc-600 dark:text-zinc-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <MapPin className="h-5 w-5" weight="duotone" />
              </div>
              <span>{influencer.location}</span>
            </div>
            {influencer.languages && influencer.languages.length > 0 && (
              <div className="flex items-center space-x-2 font-medium text-sm text-zinc-600 dark:text-zinc-400">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <Globe className="h-5 w-5" weight="duotone" />
                </div>
                <span>{influencer.languages.join(", ")}</span>
              </div>
            )}
            <div className="flex items-center space-x-2 font-medium text-sm text-zinc-600 dark:text-zinc-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <Calendar className="h-5 w-5" weight="duotone" />
              </div>
              <span>{influencer.avg_delivery_days} hari pengiriman</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function InfluencerStatsGrid({
  followersCount,
  engagementRate,
  reviewsCount,
}: {
  followersCount: number;
  engagementRate: number;
  reviewsCount: number;
}) {
  return (
    <motion.div
      className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
      variants={fadeUpItem}
    >
      <div className="flex flex-col items-center justify-center rounded-[2rem] bg-white p-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] ring-1 ring-zinc-200/50 dark:bg-zinc-900 dark:ring-zinc-800">
        <Users className="mb-3 h-8 w-8 text-primary-500" weight="duotone" />
        <div className="font-bold font-display text-3xl text-zinc-900 tracking-tight dark:text-white">
          {formatNumber(followersCount)}
        </div>
        <div className="mt-1 font-medium text-sm text-zinc-500 dark:text-zinc-400">
          Pengikut Setia
        </div>
      </div>
      <div className="flex flex-col items-center justify-center rounded-[2rem] bg-white p-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] ring-1 ring-zinc-200/50 dark:bg-zinc-900 dark:ring-zinc-800">
        <Star className="mb-3 h-8 w-8 text-yellow-500" weight="duotone" />
        <div className="font-bold font-display text-3xl text-zinc-900 tracking-tight dark:text-white">
          {engagementRate}%
        </div>
        <div className="mt-1 font-medium text-sm text-zinc-500 dark:text-zinc-400">
          Engagement Rate
        </div>
      </div>
      <div className="flex flex-col items-center justify-center rounded-[2rem] bg-white p-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] ring-1 ring-zinc-200/50 dark:bg-zinc-900 dark:ring-zinc-800">
        <ChatCircle
          className="mb-3 h-8 w-8 text-emerald-500"
          weight="duotone"
        />
        <div className="font-bold font-display text-3xl text-zinc-900 tracking-tight dark:text-white">
          {reviewsCount}
        </div>
        <div className="mt-1 font-medium text-sm text-zinc-500 dark:text-zinc-400">
          Total Ulasan
        </div>
      </div>
    </motion.div>
  );
}

function OrderCard({
  influencer,
  onOrder,
}: {
  influencer: Influencer;
  onOrder: () => void;
}) {
  const pricing = calculateOrderPricing(influencer.price_per_post);

  return (
    <motion.div className="lg:col-span-1" variants={fadeUpItem}>
      <div className="sticky top-24 overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] ring-1 ring-zinc-200/50 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="pointer-events-none absolute inset-0 z-10 rounded-[2.5rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" />
        <h3 className="mb-6 font-bold font-display text-2xl tracking-tight dark:text-white">
          Pesan Kolaborasi
        </h3>
        <div className="mb-8 space-y-5">
          <div className="flex items-center justify-between border-zinc-100 border-b pb-4 dark:border-zinc-800/50">
            <span className="font-medium text-zinc-500 dark:text-zinc-400">
              Harga per konten
            </span>
            <span className="font-bold font-display text-xl text-zinc-900 dark:text-white">
              Rp {influencer.price_per_post.toLocaleString("id-ID")}
            </span>
          </div>
          <div className="flex items-center justify-between border-zinc-100 border-b pb-4 dark:border-zinc-800/50">
            <span className="font-medium text-zinc-500 dark:text-zinc-400">
              Biaya platform (10%)
            </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-300">
              Rp {pricing.platformFee.toLocaleString("id-ID")}
            </span>
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
              Total Investasi
            </span>
            <span className="font-bold font-display text-2xl text-primary-600">
              Rp {pricing.total.toLocaleString("id-ID")}
            </span>
          </div>
        </div>
        <motion.button
          className="w-full rounded-2xl bg-zinc-900 py-4 font-bold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          onClick={onOrder}
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Lanjutkan Pesanan
        </motion.button>
        <p className="mt-5 text-center font-medium text-sm text-zinc-500 dark:text-zinc-400">
          Anda tidak akan ditagih sekarang.
        </p>
      </div>
    </motion.div>
  );
}

export function InfluencerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, error } = useInfluencer(id);
  const [activeTab, setActiveTab] = useState<"overview" | "reviews">(
    "overview"
  );

  const influencer = data?.influencer ?? null;
  const reviews = data?.reviews ?? [];

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Spinner className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !influencer) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <div className="mb-6 rounded-full bg-rose-100 p-6 dark:bg-rose-900/30">
          <X
            className="h-12 w-12 text-rose-600 dark:text-rose-400"
            weight="bold"
          />
        </div>
        <h2 className="mb-4 font-bold font-display text-3xl text-zinc-900 dark:text-white">
          Kreator tidak ditemukan
        </h2>
        <p className="mb-8 text-center text-zinc-600 dark:text-zinc-400">
          Profil yang Anda cari mungkin telah dihapus atau tidak tersedia.
        </p>
        <Link
          className="rounded-2xl bg-zinc-900 px-8 py-4 font-medium text-white transition-all hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
          to="/influencers"
        >
          Kembali Eksplor
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-50 pb-24 dark:bg-zinc-950">
      <div className="sticky top-0 z-40 border-zinc-200/50 border-b bg-white/80 pt-16 pb-4 backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            className="group inline-flex items-center space-x-2 font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            to="/influencers"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 transition-transform group-hover:-translate-x-1 dark:bg-zinc-900">
              <ArrowLeft className="h-4 w-4" weight="bold" />
            </div>
            <span>Kembali</span>
          </Link>
        </div>
      </div>

      <motion.div
        animate="show"
        className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8"
        initial="hidden"
        variants={staggerContainer}
      >
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <InfluencerSummaryCard influencer={influencer} />

            <InfluencerStatsGrid
              engagementRate={influencer.engagement_rate}
              followersCount={influencer.followers_count}
              reviewsCount={reviews.length}
            />

            <motion.div
              className="overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] ring-1 ring-zinc-200/50 dark:bg-zinc-900 dark:ring-zinc-800"
              variants={fadeUpItem}
            >
              <div className="mb-8 flex space-x-8 border-zinc-100 border-b dark:border-zinc-800/50">
                {["overview", "reviews"].map((tab) => (
                  <button
                    className={`relative pb-4 font-bold font-display text-lg transition-colors ${
                      activeTab === tab
                        ? "text-zinc-900 dark:text-white"
                        : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                    }`}
                    key={tab}
                    onClick={() => setActiveTab(tab as "overview" | "reviews")}
                    type="button"
                  >
                    {tab === "overview"
                      ? "Ikhtisar Profil"
                      : `Ulasan (${reviews.length})`}
                    {activeTab === tab && (
                      <motion.div
                        className="absolute right-0 bottom-0 left-0 h-0.5 bg-zinc-900 dark:bg-white"
                        layoutId="activeTabUnderline"
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 30,
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  initial={{ opacity: 0, y: 10 }}
                  key={activeTab}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === "overview" ? (
                    <div className="space-y-10">
                      <div>
                        <h3 className="mb-4 font-bold font-display text-xl text-zinc-900 dark:text-white">
                          Kategori Konten
                        </h3>
                        <div className="flex flex-wrap gap-3">
                          {influencer.content_categories?.map((category) => (
                            <span
                              className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 font-medium text-sm text-zinc-700 dark:border-zinc-700/50 dark:bg-zinc-800/50 dark:text-zinc-300"
                              key={category}
                            >
                              {category}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="mb-4 font-bold font-display text-xl text-zinc-900 dark:text-white">
                          Koneksi Sosial
                        </h3>
                        <div className="flex space-x-4">
                          {influencer.instagram_handle && (
                            <a
                              className="group flex items-center space-x-3 rounded-2xl border border-zinc-200 p-4 transition-colors hover:border-pink-500 hover:bg-pink-50 dark:border-zinc-800 dark:hover:border-pink-900 dark:hover:bg-pink-900/20"
                              href={`https://instagram.com/${influencer.instagram_handle}`}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 text-white">
                                <InstagramLogo
                                  className="h-6 w-6"
                                  weight="fill"
                                />
                              </div>
                              <div>
                                <span className="block font-bold text-zinc-900 group-hover:text-pink-600 dark:text-white dark:group-hover:text-pink-400">
                                  @{influencer.instagram_handle}
                                </span>
                                <span className="font-medium text-sm text-zinc-500">
                                  Instagram
                                </span>
                              </div>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {reviews.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <ChatCircle
                            className="mb-4 h-16 w-16 text-zinc-300 dark:text-zinc-700"
                            weight="duotone"
                          />
                          <p className="font-medium text-zinc-500 dark:text-zinc-400">
                            Belum ada ulasan untuk kreator ini.
                          </p>
                        </div>
                      ) : (
                        reviews.map((review) => (
                          <div
                            className="rounded-2xl border border-zinc-100 bg-zinc-50 p-6 dark:border-zinc-800/50 dark:bg-zinc-900/50"
                            key={review.id}
                          >
                            <div className="mb-4 flex items-center justify-between">
                              <div className="flex items-center space-x-1">
                                {[1, 2, 3, 4, 5].map((starValue) => (
                                  <Star
                                    className={`h-5 w-5 ${starValue <= review.rating ? "text-yellow-400" : "text-zinc-300 dark:text-zinc-600"}`}
                                    key={`star-${starValue}-${review.id}`}
                                    weight={
                                      starValue <= review.rating
                                        ? "fill"
                                        : "regular"
                                    }
                                  />
                                ))}
                              </div>
                              <span className="font-medium text-sm text-zinc-500 dark:text-zinc-400">
                                {new Date(review.created_at).toLocaleDateString(
                                  "id-ID",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  }
                                )}
                              </span>
                            </div>
                            <p className="text-zinc-700 leading-relaxed dark:text-zinc-300">
                              "{review.comment}"
                            </p>
                            {review.is_verified && (
                              <div className="mt-4 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 font-bold text-emerald-700 text-xs dark:bg-emerald-900/20 dark:text-emerald-400">
                                <CheckCircle
                                  className="mr-1.5 h-4 w-4"
                                  weight="fill"
                                />
                                Pembelian Terverifikasi
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          <OrderCard
            influencer={influencer}
            onOrder={() => {
              if (user) {
                navigate(`/order/${influencer.id}`);
              } else {
                navigate("/login", {
                  state: { from: `/order/${influencer.id}` },
                });
              }
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}
