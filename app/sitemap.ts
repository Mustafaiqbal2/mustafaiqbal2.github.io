import type { MetadataRoute } from "next";
import { pageRoutes, siteUrl } from "@/data/portfolio";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return pageRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date("2026-06-30"),
    changeFrequency: route === "/" ? "monthly" : "yearly",
    priority: route === "/" ? 1 : route.startsWith("/work/") ? 0.82 : 0.75
  }));
}
