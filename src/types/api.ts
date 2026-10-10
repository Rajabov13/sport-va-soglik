import type { RequestStatus, Urgency } from "@prisma/client";
import type { CategoryLike } from "@/components/shared/badges";

/** JSON shapes returned by the API (dates arrive as ISO strings). */
export interface RequestListItemDTO {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  urgency: Urgency;
  category: CategoryLike & { id: string };
  city: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  preferredDate: string | null;
  peopleCount: number;
  imageUrl: string | null;
  requester: { id: string; name: string; avatarUrl: string | null };
  organization: { id: string; name: string; slug: string } | null;
  matchCount: number;
  matchScore: number | null;
  createdAt: string;
  breakdown?: MatchBreakdownDTO;
}

export interface MatchBreakdownDTO {
  location: number;
  skill: number;
  availability: number;
  urgency: number;
  experience: number;
  reputation: number;
  distanceKm: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CategoryDTO extends CategoryLike {
  id: string;
  relatedSkills: string[];
  sortOrder: number;
  isActive: boolean;
}

export interface LocationDTO {
  id: string;
  slug: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
}
