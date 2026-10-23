import { describe, expect, it } from "vitest";
import {
  SEED,
  addConversion,
  allocation,
  conversionRate,
  parseVariants,
  pickLeader,
  setWeight,
  simulate,
  totals,
  type Variant,
} from "@/lib/ab-testing";

const v = (id: string, weight: number, conversions: number, views: number): Variant => ({ id, name: `${id} / x`, weight, conversions, views });

describe("rates and totals", () => {
  it("computes a conversion rate and treats zero views as 0%", () => {
    expect(conversionRate(v("a", 50, 5, 50))).toBe(10);
    expect(conversionRate(v("a", 50, 0, 0))).toBe(0);
  });

  it("sums the seed allocation to 100 and totals exposures and conversions", () => {
    expect(allocation(SEED)).toBe(100);
    expect(totals(SEED)).toEqual({ views: 538, conversions: 40, rate: (40 / 538) * 100 });
    expect(totals([])).toEqual({ views: 0, conversions: 0, rate: 0 });
  });
});

describe("pickLeader", () => {
  it("picks the highest conversion rate", () => {
    expect(pickLeader(SEED)?.id).toBe("signal");
  });

  it("does not let a variant with no views win or break the ordering", () => {
    expect(pickLeader([v("empty", 10, 0, 0), v("real", 10, 1, 20)])?.id).toBe("real");
    expect(pickLeader([v("real", 10, 1, 20), v("empty", 10, 0, 0), v("best", 10, 5, 20)])?.id).toBe("best");
  });

  it("returns undefined for an empty list", () => {
    expect(pickLeader([])).toBeUndefined();
  });
});

describe("simulate", () => {
  it("assigns each visit by weight using the injected random source", () => {
    const variants = [v("a", 25, 0, 0), v("b", 75, 0, 0)];
    const draws = [0.1, 0.24, 0.26, 0.9];
    const result = simulate(variants, draws.length, () => draws.shift() ?? 0);
    expect(result.map((item) => item.views)).toEqual([2, 2]);
    expect(variants.map((item) => item.views)).toEqual([0, 0]);
  });

  it("adds exactly one exposure per round", () => {
    const result = simulate(SEED, 50, () => 0.5);
    expect(totals(result).views).toBe(totals(SEED).views + 50);
    expect(totals(result).conversions).toBe(totals(SEED).conversions);
  });
});

describe("edits", () => {
  it("adds a conversion and keeps views at least equal to conversions", () => {
    const result = addConversion([v("a", 50, 3, 3), v("b", 50, 0, 9)], "a");
    expect(result[0]).toMatchObject({ conversions: 4, views: 4 });
    expect(result[1]).toMatchObject({ conversions: 0, views: 9 });
  });

  it("changes only the targeted weight", () => {
    expect(setWeight(SEED, "proof", 10).map((item) => item.weight)).toEqual([42, 33, 10]);
  });
});

describe("parseVariants", () => {
  it("reads a saved experiment back", () => {
    expect(parseVariants(JSON.stringify(SEED))).toEqual(SEED);
  });

  it("rejects corrupt or wrongly shaped storage instead of crashing the page", () => {
    expect(parseVariants("not json")).toBeNull();
    expect(parseVariants("{}")).toBeNull();
    expect(parseVariants("[]")).toBeNull();
    expect(parseVariants(JSON.stringify([{ id: "a", name: "A", weight: "x", conversions: 0, views: 0 }]))).toBeNull();
  });
});
