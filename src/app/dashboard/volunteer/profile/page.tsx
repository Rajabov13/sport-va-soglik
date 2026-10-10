import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { VolunteerProfileForm } from "@/features/volunteer/volunteer-profile-form";
import { getT } from "@/i18n/server";
import { requireRole } from "@/server/auth/current-user";
import { getVolunteerProfile } from "@/server/services/volunteers";
import { DEFAULT_CENTER } from "@/lib/geo";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("volunteer.profileTitle") };
}

export default async function VolunteerProfilePage() {
  const user = await requireRole(["VOLUNTEER"], "/dashboard/volunteer/profile");
  const [t, p] = await Promise.all([getT(), getVolunteerProfile(user.id)]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("volunteer.profileTitle")} subtitle={t("volunteer.profileSubtitle")} />
      <VolunteerProfileForm
        userId={user.id}
        initial={{
          bio: p.bio ?? "",
          skills: p.skills,
          categoryIds: p.categories.map((c) => c.id),
          radiusKm: p.radiusKm,
          latitude: p.latitude ?? DEFAULT_CENTER.lat,
          longitude: p.longitude ?? DEFAULT_CENTER.lng,
          isAvailableNow: p.isAvailableNow,
          availability: p.availability,
          preferredLocationIds: p.preferredLocations.map((l) => l.id),
        }}
      />
    </div>
  );
}
