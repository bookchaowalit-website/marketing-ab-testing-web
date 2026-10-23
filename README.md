# Split Room (A/B testing simulator)

A local A/B experiment bench: three seed variants with traffic weights, a weighted random visit simulator, a
manual "+ conversion" button per variant and a readout (exposures, conversions, overall rate, current lead). State is
kept in this browser's `localStorage`. It is a simulator, not an experiment platform.

Live: https://ab-testing.bookchaowalit.com (deployed by Vercel CLI; it can lag `main`, see `PRODUCT.md`).

## What it does not do

- No real pages, visitors or traffic splitting; nothing is sent anywhere.
- No statistical significance test: "current lead" is simply the highest conversion rate.
- No account, sync or sharing. Clearing site data resets the experiment.

## Run

```bash
npm ci
npm run dev
```

## Checks

```bash
npm test           # Vitest: simulator logic, local store, MCP route, home page render, Sentry scrubbing
npm run lint
npm run typecheck
npm run build
```

CI (`.github/workflows/ci.yml`) runs the shared Node workflow (with a line-coverage gate) and the shared security
scan on every push and PR to `main`.

## Code map

- `lib/ab-testing.ts`: seed variants plus rates, totals, leader, weighted `simulate` (random source injectable),
  conversion/weight edits and `parseVariants` (validates saved state).
- `lib/local-store.ts`: `localStorage` store read through `useSyncExternalStore` (no setState in an effect; falls back
  to memory when storage is blocked). This repository owns its copy.
- `app/api/mcp/route.ts`: stateless JSON-RPC endpoint with `get_seed_experiment`, `summarize` and `simulate`.
- `lib/sentry.ts` + `instrumentation*.ts`: error reporting to Sentry, errors only, personal data stripped; off when
  `NEXT_PUBLIC_SENTRY_DSN` is unset.
- `app/more-projects/page.tsx`: shared portfolio link page (copied per repository, not a package).
