import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { Providers } from "@/components/shared/providers";
import { getLocale } from "@/i18n/server";
import { getDictionary } from "@/i18n/dictionaries";
import { env } from "@/config/env";

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await getLocale());
  return {
    metadataBase: new URL(env.appUrl),
    title: { default: dict.meta.title, template: `%s · QO‘LLAB` },
    description: dict.meta.description,
    applicationName: "QO‘LLAB",
    keywords: ["volunteer", "koʻngilli", "волонтёр", "Uzbekistan", "charity", "social impact", "yordam"],
    openGraph: {
      type: "website",
      siteName: "QO‘LLAB",
      title: dict.meta.title,
      description: dict.meta.description,
      locale: "uz_UZ",
      alternateLocale: ["ru_RU", "en_US"],
    },
    twitter: { card: "summary_large_image", title: dict.meta.title, description: dict.meta.description },
    icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/favicon-32.png", sizes: "32x32" }], apple: "/icons/apple-touch-icon.png" },
    appleWebApp: { capable: true, title: "QO‘LLAB", statusBarStyle: "default" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#262a9e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const INSTALL_PROMPT_CAPTURE =
  "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__qollabInstall=e;window.dispatchEvent(new Event('qollab-installable'))});";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <head>
        {/* Capture the PWA install prompt before the app bundle loads; Chrome fires it only once per page load. */}
        <script dangerouslySetInnerHTML={{ __html: INSTALL_PROMPT_CAPTURE }} />
      </head>
      <body className="min-h-dvh">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
