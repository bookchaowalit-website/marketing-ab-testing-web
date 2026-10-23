// Pure logic for the local A/B simulator. The page and the MCP route both use it.

export type Variant = { id: string; name: string; weight: number; conversions: number; views: number };

export const STORAGE_KEY = "ab-testing-v2";

export const SEED: Variant[] = [
  { id: "control", name: "Control / the quiet baseline", weight: 42, conversions: 12, views: 200 },
  { id: "signal", name: "Signal / direct promise", weight: 33, conversions: 18, views: 190 },
  { id: "proof", name: "Proof / show the evidence", weight: 25, conversions: 10, views: 148 },
];

function isVariant(value: unknown): value is Variant {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    [item.weight, item.conversions, item.views].every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0)
  );
}

// Saved state comes from the visitor's browser: anything that is not a non-empty list of variants is ignored.
export function parseVariants(raw: string): Variant[] | null {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) && value.length > 0 && value.every(isVariant) ? value : null;
  } catch {
    return null;
  }
}

export function conversionRate(variant: Variant): number {
  return variant.views ? (variant.conversions / variant.views) * 100 : 0;
}

export function allocation(variants: Variant[]): number {
  return variants.reduce((sum, variant) => sum + variant.weight, 0);
}

export function totals(variants: Variant[]) {
  const views = variants.reduce((sum, variant) => sum + variant.views, 0);
  const conversions = variants.reduce((sum, variant) => sum + variant.conversions, 0);
  return { views, conversions, rate: views ? (conversions / views) * 100 : 0 };
}

export function pickLeader(variants: Variant[]): Variant | undefined {
  // conversionRate() is 0 for a variant with no views, so the comparison never sees NaN.
  return [...variants].sort((a, b) => conversionRate(b) - conversionRate(a))[0];
}

export function simulate(variants: Variant[], rounds: number, random: () => number = Math.random): Variant[] {
  const next = variants.map((variant) => ({ ...variant }));
  const total = allocation(next) || 1;
  for (let round = 0; round < rounds; round += 1) {
    let remaining = random() * total;
    const selected = next.find((variant) => {
      remaining -= variant.weight;
      return remaining <= 0;
    });
    if (selected) selected.views += 1;
  }
  return next;
}

export function addConversion(variants: Variant[], id: string): Variant[] {
  return variants.map((item) =>
    item.id === id ? { ...item, conversions: item.conversions + 1, views: Math.max(item.views, item.conversions + 1) } : item,
  );
}

export function setWeight(variants: Variant[], id: string, weight: number): Variant[] {
  return variants.map((item) => (item.id === id ? { ...item, weight } : item));
}

export function summarize(variants: Variant[]) {
  return {
    variants: variants.map((variant) => ({ ...variant, rate: conversionRate(variant) })),
    allocation: allocation(variants),
    ...totals(variants),
    leader: pickLeader(variants)?.id ?? null,
  };
}
