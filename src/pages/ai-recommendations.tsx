import {
  ArrowRight,
  Building2,
  DollarSign,
  MapPin,
  RefreshCw,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/lib/supabase";

const NICHES = [
  "Fashion & Gaya Hidup",
  "Teknologi",
  "Kecantikan & Perawatan Kulit",
  "Kuliner & Makanan",
  "Travel & Petualangan",
  "Fitness & Kesehatan",
  "Gaming",
  "Bisnis & Keuangan",
];

const COMPANY_SIZES = [
  "1-5 orang",
  "6-20 orang",
  "21-50 orang",
  "51-200 orang",
  "200+ orang",
];

const CAMPAIGN_TYPES = [
  "Brand awareness",
  "Peluncuran produk",
  "Penjualan dan konversi",
  "Konten edukasi",
  "Event lokal",
  "Retensi pelanggan",
];

const LOCATIONS = [
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

interface FormState {
  niche: string;
  company_size: string;
  budget: string;
  target_audience: string;
  location: string;
  campaign_type: string;
}

interface RecommendationData {
  user: {
    id: string;
    name: string;
    email: string;
  };
  summary: string;
}

const formatRupiah = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

function ProcessingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 px-4 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950">
      <div className="w-full max-w-2xl text-center">
        <div className="relative mx-auto mb-8 h-24 w-24">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary-200 dark:bg-primary-800/40" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500">
            <Sparkles className="h-12 w-12 animate-pulse text-white" />
          </div>
        </div>
        <h2 className="mb-3 font-bold font-display text-3xl text-zinc-900 dark:text-zinc-50">
          AI Sedang Menyusun Brief Kampanye Anda
        </h2>
        <p className="mx-auto max-w-xl text-zinc-600 dark:text-zinc-400">
          Kami sedang menganalisis detail SME dan kampanye untuk menemukan
          format influencer terbaik.
        </p>
        <div className="mt-8 flex justify-center gap-2">
          <div className="h-3 w-3 animate-bounce rounded-full bg-primary-600" />
          <div
            className="h-3 w-3 animate-bounce rounded-full bg-primary-600"
            style={{ animationDelay: "0.1s" }}
          />
          <div
            className="h-3 w-3 animate-bounce rounded-full bg-primary-600"
            style={{ animationDelay: "0.2s" }}
          />
        </div>
      </div>
    </div>
  );
}

interface ResultsScreenProps {
  profile: { name?: string; email?: string } | null;
  recommendation: RecommendationData | null;
  formData: FormState;
  isBudgetValid: boolean;
  budgetValue: number;
  onReset: () => void;
}

function ResultsScreen({
  profile,
  recommendation,
  formData,
  isBudgetValid,
  budgetValue,
  onReset,
}: ResultsScreenProps) {
  return (
    <div className="animate-fade-in">
      <div className="bg-gradient-to-br from-primary-50 via-white to-accent-50 py-12 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2 text-primary-500 text-sm uppercase tracking-[0.3em]">
                Hasil Singkat AI
              </p>
              <h1 className="mb-3 font-bold font-display text-4xl text-zinc-900 dark:text-zinc-50">
                Brief Kampanye Telah Terkirim
              </h1>
              <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
                AI kami siap menyusun daftar influencer terbaik. Berikut
                ringkasan kampanye yang sudah Anda kirimkan.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link className="btn-secondary" to="/influencers">
                Lihat Influencer
              </Link>
              <button
                className="btn-primary flex items-center gap-2"
                onClick={onReset}
                type="button"
              >
                <RefreshCw className="h-5 w-5" />
                Mulai Ulang
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-800">
              <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] dark:text-zinc-400">
                Profil SME
              </p>
              <h3 className="mt-2 font-semibold text-lg text-zinc-900 dark:text-zinc-50">
                {profile?.name || recommendation?.user.name || "SME Anda"}
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {profile?.email || recommendation?.user.email || ""}
              </p>
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Niche</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {formData.niche}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Ukuran bisnis</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {formData.company_size}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Budget</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {isBudgetValid ? formatRupiah(budgetValue) : "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-800">
              <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] dark:text-zinc-400">
                Ringkasan Kampanye
              </p>
              <h3 className="mt-2 font-semibold text-lg text-zinc-900 dark:text-zinc-50">
                Snapshot singkat untuk tim AI
              </h3>
              <p className="mt-4 whitespace-pre-line text-sm text-zinc-600 leading-relaxed dark:text-zinc-400">
                {recommendation?.summary ||
                  "Ringkasan kampanye belum tersedia."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-primary-100 bg-primary-50 p-6 dark:border-primary-800/30 dark:bg-primary-900/30">
            <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">
              Target Audiens
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {formData.target_audience}
            </p>
          </div>
          <div className="rounded-2xl border border-accent-100 bg-accent-50 p-6 dark:border-accent-800/30 dark:bg-accent-900/30">
            <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">
              Fokus Lokasi
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {formData.location}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-800">
            <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">
              Jenis Kampanye
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {formData.campaign_type}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CampaignFormProps {
  formData: FormState;
  isSme: boolean;
  canSubmit: boolean;
  submissionError: string;
  onChange: (
    field: keyof FormState
  ) => (
    event:
      | ChangeEvent<HTMLInputElement>
      | ChangeEvent<HTMLSelectElement>
      | ChangeEvent<HTMLTextAreaElement>
  ) => void;
  onSubmit: (event: FormEvent) => void;
}

function CampaignForm({
  formData,
  isSme,
  canSubmit,
  submissionError,
  onChange,
  onSubmit,
}: CampaignFormProps) {
  return (
    <div className="rounded-3xl bg-white p-8 shadow-xl dark:bg-zinc-900">
      <div className="mb-6">
        <h2 className="font-semibold text-2xl text-zinc-900 dark:text-zinc-50">
          Form Brief Kampanye
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Semua kolom wajib diisi agar AI bisa merangkum kebutuhan SME.
        </p>
      </div>

      {submissionError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm dark:border-red-800/30 dark:bg-red-900/20 dark:text-red-400">
          {submissionError}
        </div>
      )}

      <form className="space-y-6" onSubmit={onSubmit}>
        <div>
          <label
            className="mb-2 block font-medium text-sm text-zinc-700 dark:text-zinc-300"
            htmlFor="niche"
          >
            <Target className="mr-2 inline h-4 w-4" />
            Industri atau niche SME
          </label>
          <select
            className="input-field w-full disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isSme}
            id="niche"
            onChange={onChange("niche")}
            value={formData.niche}
          >
            <option value="">Pilih niche utama</option>
            {NICHES.map((niche) => (
              <option key={niche} value={niche}>
                {niche}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="mb-2 block font-medium text-sm text-zinc-700 dark:text-zinc-300"
            htmlFor="company_size"
          >
            <Building2 className="mr-2 inline h-4 w-4" />
            Ukuran tim atau bisnis
          </label>
          <select
            className="input-field w-full disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isSme}
            id="company_size"
            onChange={onChange("company_size")}
            value={formData.company_size}
          >
            <option value="">Pilih skala bisnis</option>
            {COMPANY_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="mb-2 block font-medium text-sm text-zinc-700 dark:text-zinc-300"
            htmlFor="budget"
          >
            <DollarSign className="mr-2 inline h-4 w-4" />
            Budget kampanye (Rp)
          </label>
          <input
            className="input-field w-full disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isSme}
            id="budget"
            inputMode="numeric"
            min={1}
            onChange={onChange("budget")}
            placeholder="Contoh: 10000000"
            type="number"
            value={formData.budget}
          />
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Estimasi yang akan digunakan AI untuk mengatur jumlah influencer.
          </p>
        </div>

        <div>
          <label
            className="mb-2 block font-medium text-sm text-zinc-700 dark:text-zinc-300"
            htmlFor="target_audience"
          >
            <Users className="mr-2 inline h-4 w-4" />
            Target audiens utama
          </label>
          <textarea
            className="input-field resize-none disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isSme}
            id="target_audience"
            onChange={onChange("target_audience")}
            placeholder="Contoh: wanita 25-35 tahun, suka skincare premium"
            rows={3}
            value={formData.target_audience}
          />
        </div>

        <div>
          <label
            className="mb-2 block font-medium text-sm text-zinc-700 dark:text-zinc-300"
            htmlFor="location"
          >
            <MapPin className="mr-2 inline h-4 w-4" />
            Lokasi target kampanye
          </label>
          <select
            className="input-field w-full disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isSme}
            id="location"
            onChange={onChange("location")}
            value={formData.location}
          >
            <option value="">Pilih area fokus</option>
            {LOCATIONS.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="mb-2 block font-medium text-sm text-zinc-700 dark:text-zinc-300"
            htmlFor="campaign_type"
          >
            <Sparkles className="mr-2 inline h-4 w-4" />
            Jenis kampanye
          </label>
          <select
            className="input-field w-full disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isSme}
            id="campaign_type"
            onChange={onChange("campaign_type")}
            value={formData.campaign_type}
          >
            <option value="">Pilih jenis kampanye</option>
            {CAMPAIGN_TYPES.map((campaignType) => (
              <option key={campaignType} value={campaignType}>
                {campaignType}
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn-primary flex w-full items-center justify-center gap-2 py-4 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canSubmit}
          type="submit"
        >
          <Sparkles className="h-5 w-5" />
          Kirim Brief Kampanye
          <ArrowRight className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}

export function AIRecommendations() {
  const { user, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState<"input" | "processing" | "results">("input");
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useProfile(!!user, authLoading);
  const [formData, setFormData] = useState<FormState>({
    niche: "",
    company_size: "",
    budget: "",
    target_audience: "",
    location: "",
    campaign_type: "",
  });
  const [submissionError, setSubmissionError] = useState("");
  const [recommendation, setRecommendation] =
    useState<RecommendationData | null>(null);

  const budgetValue = Number(formData.budget);
  const isBudgetValid =
    formData.budget.trim() !== "" &&
    Number.isFinite(budgetValue) &&
    budgetValue > 0;
  const isFormComplete = Boolean(
    formData.niche.trim() &&
      formData.company_size.trim() &&
      formData.target_audience.trim() &&
      formData.location.trim() &&
      formData.campaign_type.trim() &&
      isBudgetValid
  );
  const isSme = profile?.user_type === "sme";
  const canSubmit = Boolean(isFormComplete && isSme && user);
  let accountStatusLabel = "Akun belum SME";
  if (profileLoading) {
    accountStatusLabel = "Memuat";
  } else if (isSme) {
    accountStatusLabel = "Akun SME";
  }

  const handleChange =
    (field: keyof FormState) =>
    (
      event:
        | ChangeEvent<HTMLInputElement>
        | ChangeEvent<HTMLSelectElement>
        | ChangeEvent<HTMLTextAreaElement>
    ) => {
      setFormData((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmissionError("");
    setRecommendation(null);

    if (!user) {
      setSubmissionError(
        "Silakan masuk terlebih dahulu untuk meminta rekomendasi AI."
      );
      return;
    }

    if (!isSme) {
      setSubmissionError("Hanya akun SME yang dapat menggunakan fitur ini.");
      return;
    }

    if (!isFormComplete) {
      setSubmissionError("Lengkapi seluruh data kampanye sebelum mengirim.");
      return;
    }

    if (!isBudgetValid) {
      setSubmissionError("Budget harus lebih besar dari 0.");
      return;
    }

    setStep("processing");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("Sesi tidak valid. Silakan masuk kembali.");
      }

      const response = await fetch("/api/ai-recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          niche: formData.niche.trim(),
          company_size: formData.company_size.trim(),
          budget: budgetValue,
          target_audience: formData.target_audience.trim(),
          location: formData.location.trim(),
          campaign_type: formData.campaign_type.trim(),
        }),
      });

      const payload = (await response.json()) as {
        data?: RecommendationData;
        message?: string;
      };

      if (!(response.ok && payload.data)) {
        throw new Error(
          payload.message || "Gagal mengirim data kampanye. Silakan coba lagi."
        );
      }

      setRecommendation(payload.data);
      setStep("results");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengirim data kampanye.";
      setSubmissionError(message);
      setStep("input");
    }
  };

  const handleReset = () => {
    setFormData({
      niche: "",
      company_size: "",
      budget: "",
      target_audience: "",
      location: "",
      campaign_type: "",
    });
    setRecommendation(null);
    setSubmissionError("");
    setStep("input");
  };

  if (step === "processing") {
    return <ProcessingScreen />;
  }

  if (step === "results") {
    return (
      <ResultsScreen
        budgetValue={budgetValue}
        formData={formData}
        isBudgetValid={isBudgetValid}
        onReset={handleReset}
        profile={profile ?? null}
        recommendation={recommendation}
      />
    );
  }

  return (
    <ProtectedRoute>
      <div className="animate-fade-in">
        <div className="bg-gradient-to-br from-primary-50 via-white to-accent-50 py-16 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-8">
                <div>
                  <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-medium text-primary-600 text-sm shadow-sm dark:bg-zinc-800 dark:text-primary-400">
                    <Sparkles className="h-4 w-4" />
                    Pemetaan Kampanye SME
                  </p>
                  <h1 className="mb-4 font-bold font-display text-4xl text-zinc-900 dark:text-zinc-50">
                    Bangun brief kampanye yang tajam untuk AI NanoConnect
                  </h1>
                  <p className="text-lg text-zinc-600 dark:text-zinc-400">
                    Isi 6 data utama agar AI memahami identitas SME Anda dan
                    langsung menyaring influencer paling relevan.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-zinc-800">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
                      <Target className="h-5 w-5 text-primary-600" />
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                      Brief fokus
                    </h3>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                      AI membaca niche dan jenis kampanye untuk menyesuaikan
                      gaya konten.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-zinc-800">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-100 dark:bg-accent-900/30">
                      <DollarSign className="h-5 w-5 text-accent-600" />
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                      Budget sehat
                    </h3>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                      Rekomendasi influencer dikalibrasi dari budget SME Anda.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-zinc-800">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                      Audiens tepat
                    </h3>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                      AI menyesuaikan persona audiens dan lokasi target.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-zinc-800">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900/30">
                      <Building2 className="h-5 w-5 text-zinc-600" />
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                      Skala SME
                    </h3>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                      Ukuran bisnis membantu menentukan intensitas kolaborasi.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur dark:border-zinc-700/60 dark:bg-zinc-800/80">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] dark:text-zinc-400">
                        Profil SME
                      </p>
                      <h3 className="mt-2 font-semibold text-lg text-zinc-900 dark:text-zinc-50">
                        {profileLoading
                          ? "Memuat profil..."
                          : profile?.name || "Silakan masuk"}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {profileLoading
                          ? ""
                          : profile?.email ||
                            "Masuk untuk mengambil data profil SME Anda."}
                      </p>
                    </div>
                    <div className="rounded-full bg-primary-50 px-3 py-1 text-primary-600 text-xs dark:bg-primary-900/30 dark:text-primary-400">
                      {accountStatusLabel}
                    </div>
                  </div>
                  {profileError && (
                    <p className="mt-4 text-red-600 text-sm">
                      {profileError.message}
                    </p>
                  )}
                  {!(user || profileLoading) && (
                    <Link
                      className="mt-4 inline-flex items-center gap-2 font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                      to="/login"
                    >
                      Masuk untuk melanjutkan
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>

              <CampaignForm
                canSubmit={canSubmit}
                formData={formData}
                isSme={isSme}
                onChange={handleChange}
                onSubmit={handleSubmit}
                submissionError={submissionError}
              />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
