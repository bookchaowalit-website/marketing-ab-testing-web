import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("home page", () => {
  it("renders the seed split and the honest simulation notice", () => {
    const html = renderToString(<Home />);
    expect(html).toContain("Let the traffic answer slowly.");
    expect(html).toContain("Control / the quiet baseline");
    expect(html).toContain("100<!-- -->% allocated");
    expect(html).toContain("It does not represent real audience behavior, statistical significance, or a deployed experiment.");
  });
});
