import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteConfig";

const ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/play", changeFrequency: "daily", priority: 0.8 },
  { path: "/daily", changeFrequency: "daily", priority: 0.8 },
  { path: "/leaderboard", changeFrequency: "daily", priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
