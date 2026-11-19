// @vitest-environment happy-dom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ChartPanel, DashFoot, DashTop, Pill, Segmented, Stat, axisSteps, chartTop, labelRoom, linePoints } from "@/components/dashboard-shell";

// Tests for the copied-in Dashboard shell itself, so every app that copies it covers all of it.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const render = (node: React.ReactNode) => act(() => root.render(node));
const button = (text: string) => [...host.querySelectorAll("button")].find((b) => b.textContent?.trim() === text) as HTMLButtonElement;
const press = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function Switch() {
  const [value, setValue] = useState<"a" | "b">("a");
  return <><Segmented label="Period" options={[{ id: "a", label: "A" }, { id: "b", label: "B" }]} value={value} onChange={setValue} /><output>{value}</output></>;
}

describe("dashboard shell", () => {
  it("renders the top bar, footer, pill and stat tile", () => {
    render(<><DashTop name="Name" tagline="Tagline" /><Pill tone="green">Up</Pill><ul><Stat label="Peak" value={9} unit="kWh" note="at 13:00" /><Stat label="Plain" value="x" /></ul><DashFoot source="https://example.com/repo" /></>);
    expect(host.querySelector(".ds-brand")?.textContent).toBe("NameTagline");
    expect(host.querySelector(".ds-pill")?.getAttribute("data-tone")).toBe("green");
    expect([...host.querySelectorAll(".ds-stat")].map((tile) => tile.textContent)).toEqual(["Peak9kWhat 13:00", "Plainx"]);
    expect([...host.querySelectorAll(".ds-foot a")].map((a) => a.getAttribute("href"))).toContain("https://example.com/repo");
  });

  it("marks the pressed segment and reports the change", () => {
    render(<Switch />);
    expect(host.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe("Period");
    press(button("B"));
    expect(button("B").getAttribute("aria-pressed")).toBe("true");
    expect(button("A").getAttribute("aria-pressed")).toBe("false");
    expect(host.querySelector("output")?.textContent).toBe("b");
  });

  it("draws the chart, puts ticks on the data scale and switches to a table with the peak named", () => {
    render(<ChartPanel title="Load" subtitle="Today" summary="Peak 3" values={[1, 3, 2]} labels={["00", "01", "02"]} ticks={[0, 1, 2]} max={4} unit="kWh" labelHeading="Hour" />);
    expect(host.querySelector("svg")?.getAttribute("aria-label")).toBe("Peak 3");
    expect([...host.querySelectorAll(".ds-chart-y span")].map((span) => span.textContent)).toEqual(["0", "1", "2", "3", "4"]);
    render(<ChartPanel title="Odd" summary="s" values={[1]} labels={["a"]} ticks={[0]} max={3} unit="%" labelHeading="x" />);
    expect([...host.querySelectorAll(".ds-chart-y span")].map((span) => span.textContent)).toEqual(["0", "0.75", "1.5", "2.25", "3"]);
    render(<ChartPanel title="Load" subtitle="Today" summary="Peak 3" values={[1, 3, 2]} labels={["00", "01", "02"]} ticks={[0, 1, 2]} max={4} unit="kWh" labelHeading="Hour" />);
    const ticks = [...host.querySelectorAll<HTMLElement>(".ds-chart-x span")];
    expect(ticks.map((span) => [span.textContent, span.style.left, span.dataset.edge ?? ""])).toEqual([["00", "0%", "start"], ["01", "50%", ""], ["02", "100%", "end"]]);
    expect(host.querySelector(".ds-chart-peak")?.getAttribute("x1")).toBe("500");
    const details = host.querySelector<HTMLDetailsElement>("details.ds-chart-switch") as HTMLDetailsElement;
    const summary = details.querySelector("summary") as HTMLElement;
    expect(details.open).toBe(false);
    press(summary);
    expect(details.open).toBe(true);
    // A disclosure, not a pressed button: the name stays "Show table" and the browser announces open or closed.
    expect(summary.textContent).toBe("Show table");
    expect(host.querySelector("[aria-pressed]")).toBeNull();
    // The switch sits in the head's flex row, so it is sized by its text and wraps under the title when needed.
    expect(details.parentElement?.className).toBe("ds-panel-head");
    expect([...host.querySelectorAll("tbody tr")].map((row) => row.textContent)).toEqual(["001", "013 (peak)", "022"]);
    expect(host.querySelector('[role="region"]')?.getAttribute("aria-label")).toBe("Load as a table");
    press(summary);
    expect(details.open).toBe(false);
    expect(host.querySelector("svg")).not.toBeNull();
  });

  it("puts the table in the server HTML, so it opens without JavaScript", () => {
    const html = renderToStaticMarkup(<ChartPanel title="Load" summary="s" values={[1, 3]} labels={["00", "01"]} ticks={[0, 1]} max={4} unit="kWh" labelHeading="Hour" />);
    expect(html).toMatch(/<div class="ds-panel-head">.*<details class="ds-chart-switch"><summary class="ds-plain">Show table<\/summary><\/details><\/div><div class="ds-table-wrap".*<table class="ds-table">.*<\/table><\/div><div class="ds-chart">/);
    expect(html).toContain("<td>3 (peak)</td>");
  });

  it("draws a label once when two ticks point at the same value", () => {
    render(<ChartPanel title="One" summary="s" values={[5]} labels={["a to b"]} ticks={[0, 0]} tickLabels={["−7d", "now"]} max={5} unit="clicks" labelHeading="Interval" />);
    expect([...host.querySelectorAll(".ds-chart-x span")].map((span) => span.textContent)).toEqual(["−7d"]);
  });

  it("uses short tick text when given and draws no peak for an empty series", () => {
    render(<ChartPanel title="Clicks" summary="s" values={[]} labels={[]} ticks={[]} max={0} unit="%" labelHeading="Interval" />);
    expect(host.querySelector(".ds-chart-peak")).toBeNull();
    render(<ChartPanel title="Clicks" summary="s" values={[1, 2, 3]} labels={["a to b", "b to c", "c to d"]} ticks={[0, 2]} tickLabels={["−3h", "now"]} max={3} unit="%" labelHeading="Interval" />);
    expect([...host.querySelectorAll(".ds-chart-x span")].map((span) => span.textContent)).toEqual(["−3h", "now"]);
  });

  it("draws one value as a dot, with no line or area sloping to the right edge", () => {
    render(<ChartPanel title="Odd" summary="s" values={[1]} labels={["a"]} ticks={[0]} max={4} unit="%" labelHeading="x" />);
    expect(host.querySelector(".ds-chart-area")).toBeNull();
    expect(host.querySelector(".ds-chart-line")).toBeNull();
    const dot = host.querySelector(".ds-chart-dot");
    expect([dot?.getAttribute("x1"), dot?.getAttribute("y1"), dot?.getAttribute("y2")]).toEqual(["0", "75", "75"]);
    render(<ChartPanel title="Two" summary="s" values={[1, 2]} labels={["a", "b"]} ticks={[0, 1]} max={4} unit="%" labelHeading="x" />);
    expect(host.querySelector(".ds-chart-dot")).toBeNull();
    expect(host.querySelector(".ds-chart-area")?.getAttribute("points")).toBe("0,100 0,75 1000,50 1000,100");
    // Paint order: area, then grid, then the line, so the grid shows across the filled area.
    expect([...(host.querySelector("svg")?.children ?? [])].map((el) => el.getAttribute("class"))).toEqual(["ds-chart-area", "ds-chart-grid", "ds-chart-peak", "ds-chart-line"]);
  });

  it("labels the y axis on the same top as the line, with enough decimals for small scales", () => {
    expect(axisSteps(0)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(axisSteps(0.002)).toEqual([0, 0.0005, 0.001, 0.0015, 0.002]);
    expect(axisSteps(0.02)).toEqual([0, 0.005, 0.01, 0.015, 0.02]);
    expect(axisSteps(1000)).toEqual([0, 250, 500, 750, 1000]);
    expect(axisSteps(100)).toEqual([0, 25, 50, 75, 100]);
    expect(chartTop(100)).toBe(100);
    render(<ChartPanel title="Zero" summary="s" values={[0, 0]} labels={["a", "b"]} ticks={[0, 1]} max={0} unit="%" labelHeading="x" />);
    expect([...host.querySelectorAll(".ds-chart-y span")].map((span) => span.textContent)).toEqual(["0", "0.25", "0.5", "0.75", "1"]);
  });

  it("keeps only the current rows in the table when labels repeat", () => {
    const chart = (values: number[], labels: string[]) => <ChartPanel title="Load" summary="s" values={values} labels={labels} ticks={[0]} max={4} unit="kWh" labelHeading="Hour" />;
    render(chart([1, 2, 3], ["08:00", "08:00", "09:00"]));
    expect(host.querySelectorAll("tbody tr")).toHaveLength(3);
    render(chart([3, 1], ["09:00", "08:00"]));
    expect([...host.querySelectorAll("tbody tr")].map((row) => row.textContent)).toEqual(["09:003 (peak)", "08:001"]);
  });

  it("rounds the top up to round grid gaps and draws the line on that same top", () => {
    // max 50 has 12.5 gaps; labelled 13 / 38 they would lie, so the scale grows to 52 and every label is exact.
    expect(axisSteps(50)).toEqual([0, 13, 26, 39, 52]);
    expect(axisSteps(100.25)).toEqual([0, 26, 52, 78, 104]);
    expect(chartTop(50.5)).toBe(52);
    expect(linePoints([26, 52], 50)).toBe("0,50 1000,0");
    render(<ChartPanel title="Odd" summary="s" values={[100.25]} labels={["a"]} ticks={[0]} max={100.25} unit="%" labelHeading="x" />);
    expect(host.querySelector(".ds-chart-y span:last-child")?.textContent).toBe("104");
    expect(Number(host.querySelector(".ds-chart-dot")?.getAttribute("y1"))).toBeCloseTo(100 - (100.25 / 104) * 100);
  });

  it("gives each x label the room its neighbours leave and drops inner labels that would collide", () => {
    // Five hour ticks on a 24-hour axis (0, 6, 12, 18, 23 of 23).
    const hours = [0, 6, 12, 18, 23].map((hour) => hour / 23);
    expect(labelRoom(hours, 0.1).map(({ index }) => index)).toEqual([0, 1, 2, 3, 4]);
    // Phones need twice the room: the tightest spots go first, the end labels stay.
    expect(labelRoom(hours, 0.2).map(({ index }) => index)).toEqual([0, 2, 4]);
    // Four even ticks: the third sits a third away from the end, so it gets only that gap, never more,
    // and on a phone both inner labels give way rather than run into the end labels.
    const even = labelRoom([0, 1 / 3, 2 / 3, 1], 0.1);
    expect(even.map(({ room }) => Number(room.toFixed(3)))).toEqual([0.167, 0.333, 0.333, 0.167]);
    expect(labelRoom([0, 1 / 3, 2 / 3, 1], 0.2)).toEqual([{ index: 0, room: 0.5 }, { index: 3, room: 0.5 }]);
    expect(labelRoom([0.5], 0.2)).toEqual([{ index: 0, room: 1 }]);
    expect(labelRoom([0], 0.2)).toEqual([{ index: 0, room: 1 }]);
    // Ticks off the axis edges: the caller's first and last labels stay, only the middle gives way.
    expect(labelRoom([0.04, 0.1, 0.5, 0.9, 0.96], 0.2).map(({ index }) => index)).toEqual([0, 2, 4]);
    expect(labelRoom([0.45, 0.55], 0.5).map(({ index }) => index)).toEqual([0, 1]);
    render(<ChartPanel title="Day" summary="s" values={Array.from({ length: 24 }, (_, hour) => hour)} labels={Array.from({ length: 24 }, (_, hour) => `${hour}:00`)} ticks={[0, 6, 12, 18, 23]} max={30} unit="kWh" labelHeading="Hour" />);
    const spans = [...host.querySelectorAll<HTMLElement>(".ds-chart-x span")];
    expect(spans.map((span) => span.dataset.phone ?? "")).toEqual(["", "hide", "", "hide", ""]);
    expect(spans[0].style.getPropertyValue("--ds-tick-room")).toBe("13.04%");
    expect(spans[2].style.getPropertyValue("--ds-tick-room-phone")).toBe("47.83%");
  });

  it("puts bucket values at their bucket centres, with ticks on the bucket edges", () => {
    expect(linePoints([10, 20], 40, true)).toBe("250,75 750,50");
    render(<ChartPanel title="Clicks" summary="s" values={[10, 20]} labels={["a to b", "b to now"]} ticks={[0, 2]} tickLabels={["−4h", "now"]} max={40} unit="%" labelHeading="Interval" buckets />);
    expect(host.querySelector(".ds-chart-area")?.getAttribute("points")).toBe("250,100 250,75 750,50 750,100");
    expect(host.querySelector(".ds-chart-peak")?.getAttribute("x1")).toBe("750");
    expect([...host.querySelectorAll<HTMLElement>(".ds-chart-x span")].map((span) => [span.textContent, span.style.left, span.dataset.edge])).toEqual([["−4h", "0%", "start"], ["now", "100%", "end"]]);
    render(<ChartPanel title="One" summary="s" values={[5]} labels={["a to now"]} ticks={[0, 1]} tickLabels={["−2h", "now"]} max={10} unit="%" labelHeading="Interval" buckets />);
    expect(host.querySelector(".ds-chart-dot")?.getAttribute("x1")).toBe("500");
  });

  it("hides the table switch where :has() is missing, since the chart and table then both show", () => {
    const css = readFileSync(join(process.cwd(), "app/dashboard-shell.css"), "utf8");
    const swap = css.indexOf(".ds-chart-panel:not(:has(.ds-chart-switch[open])) .ds-table-wrap { display: none; }");
    const fallback = css.indexOf("@supports not selector(:has(*)) {\n  .ds-chart-switch { display: none; }\n}");
    expect(swap).toBeGreaterThan(-1);
    expect(fallback).toBeGreaterThan(swap);
  });

  it("keeps the selected-row bar in forced colors, as a real border after the normal rule", () => {
    const css = readFileSync(join(process.cwd(), "app/dashboard-shell.css"), "utf8");
    const normal = css.indexOf('.ds-row[aria-pressed="true"] { background: var(--ds-selected); box-shadow: inset 3px 0 0 var(--ds-accent); }');
    const forced = css.indexOf("@media (forced-colors: active) {");
    expect(normal).toBeGreaterThan(-1);
    expect(forced).toBeGreaterThan(normal);
    const block = css.slice(forced, css.indexOf("\n}", forced));
    expect(block).toContain('.ds-row[aria-pressed="true"] { border-left: 3px solid Highlight; padding-left: 9px; }');
    // The area fill would turn into one solid forced colour over the grid, so forced colors leave it out.
    expect(block).toContain(".ds-chart-area { fill: none; }");
  });

  it("maps values onto a 1000 x 100 board, clamped, with a safe max", () => {
    expect(linePoints([0, 50, 100], 100)).toBe("0,100 500,50 1000,0");
    expect(linePoints([-5, 200], 100)).toBe("0,100 1000,0");
    expect(linePoints([1], 0)).toBe("0,0");
  });
});
