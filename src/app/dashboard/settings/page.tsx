import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { InstallCard, PasswordForm, ProfileSettingsForm } from "@/features/settings/settings-forms";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/current-user";
import { getMe } from "@/server/services/users";
import { isLocale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("settings.title") };
}

export default async function SettingsPage() {
  const user = await requireUser("/dashboard/settings");
  const [t, me] = await Promise.all([getT(), getMe(user.id)]);
  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} className="mb-1" />
      <ProfileSettingsForm
        email={me.email}
        role={t(`roles.${me.role}`)}
        initial={{ name: me.name, phone: me.phone ?? "", locale: isLocale(me.locale) ? me.locale : "uz", bio: me.bio ?? "", emailNotifications: me.emailNotifications }}
      />
      <PasswordForm hasPassword={me.hasPassword} />
      <InstallCard />
    </div>
  );
}
