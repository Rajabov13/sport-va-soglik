"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CategoryDTO, LocationDTO } from "@/types/api";

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: () => api.get<CategoryDTO[]>("/api/categories"), staleTime: 5 * 60_000 });
}

export function useLocations() {
  return useQuery({ queryKey: ["locations"], queryFn: () => api.get<LocationDTO[]>("/api/locations"), staleTime: 60 * 60_000 });
}
