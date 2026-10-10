import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "QO‘LLAB — Yaxshilikni birlashtiramiz",
    short_name: "QO‘LLAB",
    description: "Yordamga muhtoj insonlar, koʻngillilar va tashkilotlarni birlashtiruvchi ijtimoiy platforma.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafaf8",
    theme_color: "#262a9e",
    lang: "uz",
    categories: ["social", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Yordam soʻrash", url: "/dashboard/requests/create" },
      { name: "Xarita", url: "/map" },
    ],
  };
}
