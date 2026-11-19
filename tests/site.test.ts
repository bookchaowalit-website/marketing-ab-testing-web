import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_URL, PUBLIC_ROUTES, buildRobots, buildSitemap, resolveSiteUrl } from "@/lib/site";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("resolveSiteUrl", () => {
  it("falls back to the default origin when unset or blank", () => {
    expect(resolveSiteUrl(undefined)).toBe(DEFAULT_SITE_URL);
    expect(resolveSiteUrl("  ")).toBe(DEFAULT_SITE_URL);
  });
  it("normalises trailing slashes and keeps a base path", () => {
    expect(resolveSiteUrl("https://example.test/")).toBe("https://example.test");
    expect(resolveSiteUrl("https://example.test/app/")).toBe("https://example.test/app");
  });
  it("rejects relative and non-http values", () => {
    expect(() => resolveSiteUrl("example.test")).toThrow(/absolute http\(s\) URL/);
    expect(() => resolveSiteUrl("ftp://example.test")).toThrow(/http or https/);
  });
});

describe("sitemap and robots", () => {
  it("lists every public route on the configured origin", () => {
    const urls = buildSitemap("https://example.test").map((entry) => entry.url);
    expect(urls.length).toBe(PUBLIC_ROUTES.length);
    expect(urls[0]).toBe("https://example.test");
    expect(urls.every((url) => url.startsWith("https://example.test"))).toBe(true);
  });
  it("prefixes the robots rules with the base path when the app lives under a subpath", () => {
    expect(buildRobots("https://example.test/app").rules).toEqual({ userAgent: "*", allow: "/app/", disallow: "/app/api/" });
    expect(buildRobots("https://example.test").rules).toEqual({ userAgent: "*", allow: "/", disallow: "/api/" });
  });

  it("points robots.txt at the same origin and keeps /api/ out of the index", () => {
    const robots = buildRobots("https://example.test");
    expect(robots.sitemap).toBe("https://example.test/sitemap.xml");
    expect(JSON.stringify(robots.rules).includes("/api/")).toBe(true);
  });
});

describe("robots and sitemap routes", () => {
  it("serve the same data as the lib builders", () => {
    expect(robots()).toEqual(buildRobots());
    expect(sitemap()).toEqual(buildSitemap());
  });
});

describe("DEFAULT_SITE_URL", () => {
  it("is the live custom domain, not the old vercel.app host", () => {
    expect(DEFAULT_SITE_URL).toBe("https://ab-testing.bookchaowalit.com");
  });
});
