// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { SEED, STORAGE_KEY } from "@/lib/ab-testing";

// Mounted tests for the A/B bench on the Dashboard shell: stats, weights, conversions, traffic, leader honesty, reset.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const $ = (selector: string) => host.querySelector(selector) as HTMLElement | null;
const button = (text: string) => [...host.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") ?? b.textContent?.trim())?.startsWith(text)) as HTMLButtonElement;
const press = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
const stats = () => [...host.querySelectorAll(".ds-stat")].map((tile) => tile.textContent);
const mount = () => act(() => root.render(<Home />));
const save = (variants: unknown) => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(variants));

beforeEach(() => {
  window.localStorage.clear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

describe("A/B bench", () => {
  it("server-renders the seed split, the honest notice and the hub link", () => {
    const html = renderToString(<Home />);
    expect(html).toContain("Split test bench");
    expect(html).toContain("Control");
    expect(html).toContain("100<!-- -->% allocated");
    expect(html).toContain("It does not represent real audience behaviour, statistical significance or a deployed experiment.");
    expect(html).toContain('href="https://bookchaowalit.com/"');
  });

  it("opens on the seed with totals and the Signal variant leading", () => {
    mount();
    expect(stats()).toEqual(["Exposures538visits shown a variant", "Conversions40added by hand", "Overall rate7.4%conversions per exposure", "Current leadSignal9.5% rate"]);
    expect([...host.querySelectorAll(".ab-variant .ds-row-value")].map((cell) => cell.textContent)).toEqual(["6.0%", "9.5%", "6.8%"]);
    expect($(".ds-callout strong")?.textContent).toBe("Signal leads for now");
  });

  it("adds a conversion, changes a weight and flags an allocation that is not 100%", () => {
    mount();
    press(button("Add a conversion to Proof"));
    expect(stats()[1]).toBe("Conversions41added by hand");
    const slider = host.querySelector('input[aria-label="Control traffic weight"]') as HTMLInputElement;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(slider, "50");
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(host.textContent).toContain("108% allocated");
    expect($('.ds-panel-head .ds-pill[data-tone="amber"]')).not.toBeNull();
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]")[0].weight).toBe(50);
  });

  it("simulates visits by weight and resets to the sample", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    mount();
    press(button("Simulate one visit"));
    expect(stats()[0]).toBe("Exposures539visits shown a variant");
    press(button("Run 50 visits"));
    expect(stats()[0]).toBe("Exposures589visits shown a variant");
    expect(host.querySelector(".ab-variant .ds-row-detail")?.textContent).toContain("251 exposures");
    press(button("Reset to sample"));
    expect(stats()[0]).toBe("Exposures538visits shown a variant");
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]")).toEqual(SEED);
  });

  it("names no leader before any conversion", () => {
    save(SEED.map((variant) => ({ ...variant, conversions: 0, views: 0 })));
    mount();
    expect(stats()[3]).toBe("Current lead—not enough data yet");
    expect($(".ds-callout")?.textContent).toBe("No leader yetNo conversions yet. Add a conversion to a variant to compare rates.");
  });

  it("names no leader when the best rate is tied", () => {
    save(SEED.map((variant) => ({ ...variant, conversions: 5, views: 50 })));
    mount();
    expect(stats()[3]).toBe("Current lead—tied, no leader yet");
    expect($(".ds-callout")?.textContent).toContain("The best rate is shared");
  });
});
