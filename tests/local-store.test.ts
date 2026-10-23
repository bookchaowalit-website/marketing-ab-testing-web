import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalStore } from "@/lib/local-store";

const parse = (raw: string) => {
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  };
}

describe("createLocalStore", () => {
  beforeEach(() => vi.stubGlobal("localStorage", fakeStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("uses the fallback on the server snapshot and when nothing is saved", () => {
    const store = createLocalStore("k", 1, parse);
    expect(store.getServerSnapshot()).toBe(1);
    expect(store.getSnapshot()).toBe(1);
  });

  it("reads a saved value and ignores one that does not parse", () => {
    vi.stubGlobal("localStorage", fakeStorage({ good: "5", bad: "x" }));
    expect(createLocalStore("good", 1, parse).getSnapshot()).toBe(5);
    expect(createLocalStore("bad", 1, parse).getSnapshot()).toBe(1);
  });

  it("returns the same snapshot until storage changes (no render loop)", () => {
    vi.stubGlobal("localStorage", fakeStorage({ k: "[1]" }));
    const store = createLocalStore<number[]>("k", [], (raw) => JSON.parse(raw));
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it("saves, notifies subscribers and applies functional updates", () => {
    const storage = fakeStorage();
    vi.stubGlobal("localStorage", storage);
    const store = createLocalStore("k", 1, parse);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.update((n) => n + 2);
    expect(store.getSnapshot()).toBe(3);
    expect(storage.data.get("k")).toBe("3");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.set(4);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps working in memory when storage throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    const store = createLocalStore("k", 1, parse);
    expect(store.getSnapshot()).toBe(1);
    store.set(7);
    expect(store.getSnapshot()).toBe(7);
  });
});
