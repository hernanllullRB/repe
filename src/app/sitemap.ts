import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { config } from "@/lib/config";
import { getSearchIndex } from "@/lib/data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const index = await getSearchIndex();
  return [
    { url: config.siteUrl, changeFrequency: "weekly", priority: 1 },
    ...index.map((e) => ({
      url: `${config.siteUrl}/ejercicio/${e.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
