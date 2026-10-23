// A tiny localStorage-backed store for useSyncExternalStore: the server and the first client render use the
// fallback, then React re-renders with the saved value. No setState inside an effect.

export type LocalStore<T> = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  set: (next: T) => void;
  update: (change: (current: T) => T) => void;
};

export function createLocalStore<T>(key: string, fallback: T, parse: (raw: string) => T | null): LocalStore<T> {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null = null;
  let cached = fallback;
  let storageWorks = true;

  function getSnapshot(): T {
    if (!storageWorks) return cached;
    let raw: string | null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      storageWorks = false; // Private mode or blocked storage: keep the in-memory value.
      return cached;
    }
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cached = raw === null ? fallback : (parse(raw) ?? fallback);
    }
    return cached;
  }

  function set(next: T) {
    cached = next;
    try {
      const raw = JSON.stringify(next);
      localStorage.setItem(key, raw);
      cachedRaw = raw;
    } catch {
      storageWorks = false;
    }
    for (const listener of listeners) listener();
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) listener();
    };
    if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
    };
  }

  return { subscribe, getSnapshot, getServerSnapshot: () => fallback, set, update: (change) => set(change(getSnapshot())) };
}
