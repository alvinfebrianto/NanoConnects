import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FILTER_DEFAULTS } from "@/lib/constants";
import type { FilterOptions } from "@/types";

interface UseFiltersReturn {
  searchQuery: string;
  filters: FilterOptions;
  showFilters: boolean;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: FilterOptions) => void;
  setShowFilters: (show: boolean) => void;
  clearFilters: () => void;
  activeFiltersCount: number;
  serverFilters: FilterOptions;
}

function getDefaultFilters(): FilterOptions {
  return {
    niche: FILTER_DEFAULTS.NICHE,
    location: FILTER_DEFAULTS.LOCATION,
    minPrice: 0,
    maxPrice: FILTER_DEFAULTS.MAX_PRICE,
    verificationStatus: FILTER_DEFAULTS.VERIFICATION_STATUS,
  };
}

export function useFilters(): UseFiltersReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  const [filters, setFilters] = useState<FilterOptions>({
    niche: searchParams.get("niche") || FILTER_DEFAULTS.NICHE,
    location: searchParams.get("location") || FILTER_DEFAULTS.LOCATION,
    minPrice: Number(searchParams.get("minPrice")) || 0,
    maxPrice: Number(searchParams.get("maxPrice")) || FILTER_DEFAULTS.MAX_PRICE,
    verificationStatus:
      (searchParams.get(
        "verificationStatus"
      ) as FilterOptions["verificationStatus"]) ||
      FILTER_DEFAULTS.VERIFICATION_STATUS,
  });

  // Sync filters with URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) {
      params.set("q", searchQuery);
    }
    if (filters.niche && filters.niche !== FILTER_DEFAULTS.NICHE) {
      params.set("niche", filters.niche);
    }
    if (filters.location && filters.location !== FILTER_DEFAULTS.LOCATION) {
      params.set("location", filters.location);
    }
    if (filters.minPrice !== undefined && filters.minPrice > 0) {
      params.set("minPrice", String(filters.minPrice));
    }
    if (
      filters.maxPrice !== undefined &&
      filters.maxPrice !== FILTER_DEFAULTS.MAX_PRICE
    ) {
      params.set("maxPrice", String(filters.maxPrice));
    }
    if (
      filters.verificationStatus &&
      filters.verificationStatus !== FILTER_DEFAULTS.VERIFICATION_STATUS
    ) {
      params.set("verificationStatus", filters.verificationStatus);
    }

    setSearchParams(params, { replace: true });
  }, [searchQuery, filters, setSearchParams]);

  // Prepare server-side filters (exclude defaults)
  const serverFilters = useMemo(() => {
    const result: FilterOptions = {};
    if (filters.niche && filters.niche !== FILTER_DEFAULTS.NICHE) {
      result.niche = filters.niche;
    }
    if (filters.location && filters.location !== FILTER_DEFAULTS.LOCATION) {
      result.location = filters.location;
    }
    if (filters.minPrice !== undefined && filters.minPrice > 0) {
      result.minPrice = filters.minPrice;
    }
    if (
      filters.maxPrice !== undefined &&
      filters.maxPrice !== FILTER_DEFAULTS.MAX_PRICE
    ) {
      result.maxPrice = filters.maxPrice;
    }
    if (
      filters.verificationStatus &&
      filters.verificationStatus !== FILTER_DEFAULTS.VERIFICATION_STATUS
    ) {
      result.verificationStatus = filters.verificationStatus;
    }
    return result;
  }, [filters]);

  const clearFilters = () => {
    setFilters(getDefaultFilters());
    setSearchQuery("");
  };

  const activeFiltersCount =
    (filters.niche === FILTER_DEFAULTS.NICHE ? 0 : 1) +
    (filters.location === FILTER_DEFAULTS.LOCATION ? 0 : 1) +
    (filters.verificationStatus === FILTER_DEFAULTS.VERIFICATION_STATUS
      ? 0
      : 1) +
    (filters.minPrice === 0 ? 0 : 1) +
    (filters.maxPrice === FILTER_DEFAULTS.MAX_PRICE ? 0 : 1);

  return {
    searchQuery,
    filters,
    showFilters,
    setSearchQuery,
    setFilters,
    setShowFilters,
    clearFilters,
    activeFiltersCount,
    serverFilters,
  };
}
