# Split Room (A/B testing simulator) — Product truth

> Inferred from the code and copy (no user interview). Checked against the portfolio card claims review
> (`portfolio-site-web/docs/audits/CARD-CLAIMS-REVIEW-2026-10.md`, row `ab-testing`, evidence Live→Prototype) on
> 2026-10-23.

## What it is

A client-side simulator of a three-variant A/B split, with state saved in the visitor's browser.

## Who it is for

A portfolio visitor who wants to see how weighted allocation and conversion rates relate, without any real traffic.

## What works today

1. Three seed variants (Control, Signal, Proof) with weights 42/33/25; a slider per variant changes its weight, and
   the header shows the total allocation (it warns when it is not 100%).
2. "Simulate one visit" and "Run 50 visits" add exposures by weighted random selection (`Math.random`) in the browser.
3. "+ conversion" records one conversion on a variant; the readout shows total exposures, conversions, overall rate
   and the variant with the highest rate. "Reset seed" restores the seed.
4. The experiment is saved in `localStorage` and restored on reload; corrupt saved data is ignored and the seed is
   used.
5. `/api/mcp` answers JSON-RPC with `get_seed_experiment`, `summarize` (rates, totals, leader for given variants) and
   `simulate` (1–1000 visits on given variants or the seed). It is stateless and cannot see a visitor's browser data.
6. Front-end and server errors go to Sentry (errors only, personal data stripped) when `NEXT_PUBLIC_SENTRY_DSN` is set.

## What does not work (and must not be claimed)

- No variant management on real pages, no automatic traffic splitting, no use across any number of live pages.
- No statistical significance engine; the page says so ("does not represent real audience behavior, statistical
  significance, or a deployed experiment").
- No real visitors, accounts, sync or analytics beyond Vercel Analytics and Speed Insights on this page itself.

## Live URL and deploy state

- Live: https://ab-testing.bookchaowalit.com (HTTP 200 on 2026-10-23).
- The Vercel project `bookchaowalit-ab-testing-frontend` is deployed only by CLI. Last production deployment:
  2026-10-23 (CLI, commit 556eb5e, the Next 16.4.2 CVE patch). Its Git link names the old repository
  (`bookchaowalit/bookchaowalit-ab-testing-frontend`), so a push to `main` does not deploy: the live site lags `main`
  (no Sentry, old template MCP route) until the owner reconnects Vercel Git to this repository (owner action D9).
- `NEXT_PUBLIC_SENTRY_DSN` is set on the Vercel project (Sentry project `marketing-ab-testing-web`, org
  `personal-yu0`).

## Boundaries

- Browser-only apart from the stateless `/api/mcp` route.
