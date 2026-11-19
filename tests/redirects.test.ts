import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";

describe("redirects", () => {
  it("sends the retired /more-projects page to the portfolio hub for good", async () => {
    expect(await nextConfig.redirects?.()).toEqual([
      { source: "/more-projects", destination: "https://bookchaowalit.com/", permanent: true },
    ]);
  });
});
