import type { MetadataRoute } from "next";
import { env } from "@/config/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/map", "/organizations", "/campaigns", "/impact", "/volunteers"], disallow: ["/dashboard", "/admin", "/api", "/auth"] }],
    sitemap: `${env.appUrl}/sitemap.xml`,
  };
}
