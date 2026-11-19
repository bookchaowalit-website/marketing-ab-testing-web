import type { MetadataRoute } from "next";

/** Default canonical origin; override per deployment with NEXT_PUBLIC_SITE_URL. */
export const DEFAULT_SITE_URL = "https://ab-testing.bookchaowalit.com";

/** Public routes listed in sitemap.xml (keep in sync with app/). */
export const PUBLIC_ROUTES = ["/"] as const;

/**
 * Resolve the canonical origin used by metadata, robots.txt, sitemap.xml and the
 * MCP app info. Unset or blank falls back to DEFAULT_SITE_URL; anything that is
 * not an absolute http(s) URL fails loudly instead of emitting broken URLs.
 */
export function resolveSiteUrl(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return DEFAULT_SITE_URL;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`NEXT_PUBLIC_SITE_URL must be an absolute http(s) URL, got "${value}"`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`NEXT_PUBLIC_SITE_URL must use http or https, got "${url.protocol}"`);
  }
  return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
}

export const SITE_URL = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export function buildSitemap(base: string = SITE_URL): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: route === "/" ? base : `${base}${route}`,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.5,
  }));
}

/** Rules carry the base path (an app served under https://host/app keeps its API at /app/api/). */
export function buildRobots(base: string = SITE_URL): MetadataRoute.Robots {
  const path = new URL(base).pathname.replace(/\/+$/, "");
  return {
    rules: { userAgent: "*", allow: `${path}/`, disallow: `${path}/api/` },
    sitemap: `${base}/sitemap.xml`,
  };
}
