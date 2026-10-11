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

// Presentation demo timer: /presentation.html hands over via "#demo=<end epoch ms>"; the countdown survives navigation in this tab.
const DEMO_TIMER =
  "(function(){try{var m=location.hash.match(/demo=(\\d+)/);if(m){sessionStorage.setItem('qollabDemoEnd',m[1]);history.replaceState(null,'',location.pathname+location.search)}var end=+sessionStorage.getItem('qollabDemoEnd');if(!end)return;" +
  "function run(){var d=document.createElement('div');d.style.cssText='position:fixed;top:12px;right:12px;z-index:2147483647;background:rgba(15,23,42,.92);color:#fff;border:2px solid #22c55e;border-radius:14px;padding:8px 16px;font:800 32px system-ui;font-variant-numeric:tabular-nums;pointer-events:none';document.body.appendChild(d);" +
  "function t(){var l=Math.max(0,Math.round((end-Date.now())/1000));d.textContent=Math.floor(l/60)+':'+('0'+l%60).slice(-2);d.style.borderColor=d.style.color=l<=30?'#ef4444':l<=60?'#f59e0b':'#fff';if(l<=0){d.style.borderColor='#ef4444';sessionStorage.removeItem('qollabDemoEnd');clearInterval(i)}}var i=setInterval(t,1000);t()}" +
  "document.readyState==='loading'?document.addEventListener('DOMContentLoaded',run):run()}catch(e){}})();";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <head>
        {/* Capture the PWA install prompt before the app bundle loads; Chrome fires it only once per page load. */}
        <script dangerouslySetInnerHTML={{ __html: INSTALL_PROMPT_CAPTURE }} />
        <script dangerouslySetInnerHTML={{ __html: DEMO_TIMER }} />
      </head>
      <body className="min-h-dvh">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
