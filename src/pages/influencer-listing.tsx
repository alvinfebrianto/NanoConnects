import { Funnel, MagnifyingGlass, Users, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { InfluencerCard } from "@/components/influencer/influencer-card";
import { useInfluencers } from "@/hooks/use-influencers";
import type { FilterOptions, Influencer } from "@/types";

const SKELETON_IDS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"] as const;

interface InfluencerListContentProps {
  isLoading: boolean;
  influencers: Influencer[];
  onClearFilters: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

function InfluencerListContent({
  isLoading,
  influencers,
  onClearFilters,
}: InfluencerListContentProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {SKELETON_IDS.map((id) => (
          <div
            className="flex flex-col overflow-hidden rounded-[2.5rem] bg-zinc-50 p-2 dark:bg-zinc-900/50"
            key={id}
          >
            <div className="mb-4 h-56 animate-pulse rounded-t-[2rem] rounded-b-[1rem] bg-zinc-200 dark:bg-zinc-800" />
            <div className="px-4 pb-4">
              <div className="mb-4 h-6 w-1/2 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="mb-4 h-4 w-3/4 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="mt-8 flex justify-between">
                <div className="h-8 w-1/3 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-10 w-1/3 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (influencers.length === 0) {
    return (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center rounded-[3rem] border border-zinc-200 border-dashed bg-zinc-50/50 py-32 dark:border-zinc-800 dark:bg-zinc-900/20"
        initial={{ opacity: 0, y: 20 }}
      >
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <Users
            className="h-12 w-12 text-zinc-400 dark:text-zinc-500"
            weight="duotone"
          />
        </div>
        <h3 className="mb-3 font-bold font-display text-2xl text-zinc-900 tracking-tight dark:text-zinc-50">
          Tidak ada hasil
        </h3>
        <p className="mb-8 max-w-md text-center text-zinc-600 dark:text-zinc-400">
          Kami tidak dapat menemukan influencer yang cocok dengan kriteria Anda.
          Coba sesuaikan filter atau rentang harga.
        </p>
        <button
          className="rounded-2xl bg-zinc-900 px-8 py-4 font-medium text-white transition-transform hover:scale-105 hover:bg-zinc-800 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          onClick={onClearFilters}
          type="button"
        >
          Hapus Semua Filter
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      animate="visible"
      className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
      initial="hidden"
      variants={containerVariants}
    >
      {influencers.map((influencer) => (
        <InfluencerCard influencer={influencer} key={influencer.id} />
      ))}
    </motion.div>
  );
}

const NICHES = [
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
];

const LOCATIONS = [
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
];

const currencyFormatter = new Intl.NumberFormat("id-ID");

export function InfluencerListing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const initialFilters: FilterOptions = {
    niche: searchParams.get("niche") || "Semua Niche",
    location: searchParams.get("location") || "Semua Lokasi",
    minPrice: Number(searchParams.get("minPrice")) || 0,
    maxPrice: Number(searchParams.get("maxPrice")) || 10_000_000,
    verificationStatus:
      (searchParams.get(
        "verificationStatus"
      ) as FilterOptions["verificationStatus"]) || "all",
  };

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) {
      params.set("q", searchQuery);
    }
    if (filters.niche && filters.niche !== "Semua Niche") {
      params.set("niche", filters.niche);
    }
    if (filters.location && filters.location !== "Semua Lokasi") {
      params.set("location", filters.location);
    }
    if (filters.minPrice !== undefined && filters.minPrice > 0) {
      params.set("minPrice", String(filters.minPrice));
    }
    if (filters.maxPrice !== undefined && filters.maxPrice !== 10_000_000) {
      params.set("maxPrice", String(filters.maxPrice));
    }
    if (filters.verificationStatus && filters.verificationStatus !== "all") {
      params.set("verificationStatus", filters.verificationStatus);
    }

    setSearchParams(params, { replace: true });
  }, [searchQuery, filters, setSearchParams]);

  const serverFilters: FilterOptions = useMemo(() => {
    const result: FilterOptions = {};
    if (filters.niche && filters.niche !== "Semua Niche") {
      result.niche = filters.niche;
    }
    if (filters.location && filters.location !== "Semua Lokasi") {
      result.location = filters.location;
    }
    if (filters.minPrice !== undefined && filters.minPrice > 0) {
      result.minPrice = filters.minPrice;
    }
    if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
      result.maxPrice = filters.maxPrice;
    }
    if (filters.verificationStatus && filters.verificationStatus !== "all") {
      result.verificationStatus = filters.verificationStatus;
    }
    return result;
  }, [filters]);

  const { data: influencers = [], isLoading } = useInfluencers(serverFilters);

  const filteredInfluencers = useMemo(() => {
    if (!searchQuery) {
      return influencers;
    }
    const query = searchQuery.toLowerCase();
    return influencers.filter(
      (inf) =>
        inf.user?.name?.toLowerCase().includes(query) ||
        inf.niche?.toLowerCase().includes(query) ||
        inf.location?.toLowerCase().includes(query) ||
        inf.content_categories?.some((cat) => cat.toLowerCase().includes(query))
    );
  }, [searchQuery, influencers]);

  const clearFilters = () => {
    setFilters({
      niche: "Semua Niche",
      location: "Semua Lokasi",
      minPrice: 0,
      maxPrice: 10_000_000,
      verificationStatus: "all",
    });
    setSearchQuery("");
  };

  const activeFiltersCount =
    (filters.niche === "Semua Niche" ? 0 : 1) +
    (filters.location === "Semua Lokasi" ? 0 : 1) +
    (filters.verificationStatus === "all" ? 0 : 1) +
    (filters.maxPrice === 10_000_000 ? 0 : 1);

  return (
    <div className="min-h-[100dvh] bg-zinc-50 pb-24 dark:bg-zinc-950">
      {/* Asymmetric Hero Section */}
      <div className="relative overflow-hidden bg-white pt-24 pb-16 dark:bg-zinc-900">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.1),transparent_50%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.05),transparent_50%)]" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-12">
            <div className="md:col-span-7">
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="mb-4 inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 font-medium text-primary-700 text-sm dark:border-primary-900/50 dark:bg-primary-900/20 dark:text-primary-400">
                  <span className="relative mr-2 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
                  </span>
                  Database Terverifikasi
                </div>
                <h1 className="mb-6 font-bold font-display text-5xl text-zinc-900 leading-[1.1] tracking-tighter md:text-6xl lg:text-7xl dark:text-white">
                  Temukan <br />
                  <span className="bg-gradient-to-r from-primary-600 to-teal-400 bg-clip-text text-transparent">
                    Kreator Ideal
                  </span>
                </h1>
                <p className="max-w-xl text-lg text-zinc-600 leading-relaxed md:text-xl dark:text-zinc-400">
                  Jelajahi jaringan eksklusif nano influencer. Kurasi berbasis
                  data untuk campaign brand Anda berikutnya.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Command Bar */}
      <div className="sticky top-16 z-40 border-zinc-200/50 border-y bg-white/80 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all dark:border-zinc-800/50 dark:bg-zinc-950/80">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="group relative flex-1">
              <MagnifyingGlass
                className="absolute top-1/2 left-5 h-5 w-5 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary-600 dark:text-zinc-500"
                weight="bold"
              />
              <input
                className="w-full rounded-2xl border-0 bg-zinc-100/50 py-4 pr-6 pl-14 text-zinc-900 ring-1 ring-zinc-200 ring-inset transition-all focus:bg-white focus:ring-2 focus:ring-primary-600 focus:ring-inset dark:bg-zinc-900/50 dark:text-white dark:ring-zinc-800 focus:dark:bg-zinc-900"
                id="search-influencer"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kreator, niche, atau kota..."
                type="search"
                value={searchQuery}
              />
            </div>
            <button
              className={`flex h-14 items-center justify-center space-x-2 rounded-2xl px-8 font-medium transition-all active:scale-95 ${
                showFilters || activeFiltersCount > 0
                  ? "bg-zinc-900 text-white shadow-md dark:bg-white dark:text-zinc-900"
                  : "bg-white text-zinc-700 ring-1 ring-zinc-200 ring-inset hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800 dark:hover:bg-zinc-800"
              }`}
              onClick={() => setShowFilters(!showFilters)}
              type="button"
            >
              <Funnel
                className="h-5 w-5"
                weight={activeFiltersCount > 0 ? "fill" : "regular"}
              />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 font-bold text-[10px] text-white dark:bg-primary-600">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                animate={{ height: "auto", opacity: 1 }}
                className="overflow-hidden"
                exit={{ height: 0, opacity: 0 }}
                initial={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
              >
                <div className="mt-6 grid grid-cols-1 gap-6 border-zinc-100 border-t pt-6 md:grid-cols-4 dark:border-zinc-800/50">
                  <div className="space-y-2">
                    <label
                      className="font-bold text-xs text-zinc-500 uppercase tracking-wider dark:text-zinc-400"
                      htmlFor="filter-niche"
                    >
                      Kategori
                    </label>
                    <div className="relative">
                      <select
                        className="w-full appearance-none rounded-xl border-0 bg-zinc-100 px-4 py-3 font-medium text-sm text-zinc-900 ring-1 ring-transparent ring-inset transition-all focus:ring-2 focus:ring-primary-600 dark:bg-zinc-900 dark:text-zinc-100"
                        id="filter-niche"
                        onChange={(e) =>
                          setFilters({ ...filters, niche: e.target.value })
                        }
                        value={filters.niche}
                      >
                        {NICHES.map((niche) => (
                          <option key={niche} value={niche}>
                            {niche}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      className="font-bold text-xs text-zinc-500 uppercase tracking-wider dark:text-zinc-400"
                      htmlFor="filter-location"
                    >
                      Lokasi
                    </label>
                    <select
                      className="w-full appearance-none rounded-xl border-0 bg-zinc-100 px-4 py-3 font-medium text-sm text-zinc-900 ring-1 ring-transparent ring-inset transition-all focus:ring-2 focus:ring-primary-600 dark:bg-zinc-900 dark:text-zinc-100"
                      id="filter-location"
                      onChange={(e) =>
                        setFilters({ ...filters, location: e.target.value })
                      }
                      value={filters.location}
                    >
                      {LOCATIONS.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label
                        className="font-bold text-xs text-zinc-500 uppercase tracking-wider dark:text-zinc-400"
                        htmlFor="filter-price"
                      >
                        Maks Harga
                      </label>
                      <span className="font-bold text-primary-600 text-xs dark:text-primary-400">
                        Rp {currencyFormatter.format(filters.maxPrice || 0)}
                      </span>
                    </div>
                    <div className="py-2">
                      <input
                        className="w-full accent-primary-600"
                        id="filter-price"
                        max="10000000"
                        min="0"
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            maxPrice: Number.parseInt(e.target.value, 10),
                          })
                        }
                        step="50000"
                        type="range"
                        value={filters.maxPrice}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      className="font-bold text-xs text-zinc-500 uppercase tracking-wider dark:text-zinc-400"
                      htmlFor="filter-verification"
                    >
                      Status Verifikasi
                    </label>
                    <select
                      className="w-full appearance-none rounded-xl border-0 bg-zinc-100 px-4 py-3 font-medium text-sm text-zinc-900 ring-1 ring-transparent ring-inset transition-all focus:ring-2 focus:ring-primary-600 dark:bg-zinc-900 dark:text-zinc-100"
                      id="filter-verification"
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          verificationStatus: e.target
                            .value as FilterOptions["verificationStatus"],
                        })
                      }
                      value={filters.verificationStatus}
                    >
                      <option value="all">Semua Kreator</option>
                      <option value="verified">Hanya Terverifikasi</option>
                      <option value="pending">Belum Verifikasi</option>
                    </select>
                  </div>

                  {activeFiltersCount > 0 && (
                    <div className="flex justify-end pt-2 md:col-span-4">
                      <button
                        className="flex items-center space-x-1.5 rounded-lg px-3 py-2 font-medium text-rose-600 text-sm transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                        onClick={clearFilters}
                        type="button"
                      >
                        <X className="h-4 w-4" weight="bold" />
                        <span>Reset Filter</span>
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-bold font-display text-2xl text-zinc-900 dark:text-white">
            Kreator Tersedia{" "}
            <span className="text-zinc-400 dark:text-zinc-600">
              ({filteredInfluencers.length})
            </span>
          </h2>
        </div>

        <InfluencerListContent
          influencers={filteredInfluencers}
          isLoading={isLoading}
          onClearFilters={clearFilters}
        />
      </div>
    </div>
  );
}
