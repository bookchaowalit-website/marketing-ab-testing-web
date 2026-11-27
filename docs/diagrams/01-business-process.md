# 01 — Business process (As-Is / To-Be)

marketing-ab-testing-web คือตัวจำลองการแบ่งทราฟฟิก A/B 3 variant (ab-testing.bookchaowalit.com) ทำงานใน browser และเก็บสถานะใน localStorage พร้อม endpoint `/api/mcp` แบบ stateless ที่ใช้ตรรกะชุดเดียวกัน ไม่มีผู้เยี่ยมชมจริงหรือข้อมูลจริง

Last reviewed: 2026-11-28 · commit `3aa016f`

## As-Is (จากโค้ดวันนี้)

```mermaid
flowchart TD
  PUSH["push or PR to main"] --> CI["GitHub Actions: shared ci-node + shared security scan"]
  MAIN["push to main"] -.->|"PRODUCT.md 2026-10-23: Vercel Git link names the old repository, deploy by CLI; current state [ต้องยืนยัน]"| PROD["production may lag main (no Sentry, old MCP route as of 2026-10-23)"]
  VISIT["visitor request (code on main at 3aa016f)"] --> PAGE["GET / : first paint uses SEED (Control 42, Signal 33, Proof 25)"]
  PAGE --> LOAD["useSyncExternalStore reads localStorage via createLocalStore, parseVariants"]
  LOAD -->|"missing, corrupt or storage blocked: fall back to SEED, UI still works"| UI["stat tiles, variant rows with rates, allocation pill (warns if not 100)"]
  UI --> W["weight slider: setWeight"]
  UI --> SIM["Simulate one visit or Run 50 visits: simulate picks a variant by weight with Math.random"]
  UI --> CONV["Add conversion on a variant: addConversion"]
  UI --> RESET["Reset to sample: store.set(SEED)"]
  W --> SAVE["store.set: value kept in memory, then tries localStorage; if the write throws the edit lives in memory only and is lost on reload"]
  SIM --> SAVE
  CONV --> SAVE
  RESET --> SAVE
  SAVE --> UI
  MCP["POST /api/mcp JSON-RPC"] -->|"initialize"| INIT["protocol info only, no tool runs"]
  MCP -->|"tools/list"| LIST["tool list only, no tool runs"]
  MCP -->|"tools/call"| TOOLS["get_seed_experiment, summarize, simulate (rounds 1 to 1000), nothing stored"]
  MCP -->|"unknown method"| ERR["HTTP 400 with JSON-RPC error code"]
  TOOLS -->|"bad tool or arguments"| ERR
  PAGE -.->|"runtime error, only if NEXT_PUBLIC_SENTRY_DSN set"| SENTRY["Sentry, errors only, scrubEvent strips request, user, query strings"]
```

Sources: `app/page.tsx`, `lib/ab-testing.ts`, `lib/local-store.ts`, `app/api/mcp/route.ts`, `lib/site.ts`, `lib/sentry.ts`, `next.config.ts`, `PRODUCT.md`

ข้อเท็จจริงจากโค้ด: route `/api/mcp` มองไม่เห็นข้อมูลใน browser ของผู้เยี่ยมชม และไม่มี auth/rate limit ในโค้ด (เปิดสาธารณะ, stateless); ไม่มี significance test; ไม่มี analytics ใน `package.json`. [ต้องยืนยัน] สถานะ deploy ปัจจุบัน (PRODUCT.md บันทึกเมื่อ 2026-10-23).

## To-Be (PRODUCT.md §Live URL and deploy state)

```mermaid
flowchart TD
  PUSH["push to main"] --> CI["GitHub Actions: shared ci-node + shared security scan"]
  PUSH --> VERCEL["Vercel Git deploy to ab-testing.bookchaowalit.com, Git link points to this repository"]
  VERCEL --> PAGE["GET / and POST /api/mcp (same as As-Is)"]
```

Sources: `PRODUCT.md` (owner action D9: reconnect Vercel Git to this repository)

## Gap

| ID | As-Is → To-Be | Status | Owner | Evidence |
|---|---|---|---|---|
| G1 | Vercel Git link ชี้ repo เก่า, deploy ด้วย CLI → เชื่อมกับ repo นี้ให้ push to `main` deploy เอง | decide | owner | `PRODUCT.md` §Live URL and deploy state (owner action D9) |

## Open questions

- production มี Sentry และ MCP route ปัจจุบันหรือยัง (PRODUCT.md บันทึกว่า live site ล้าหลัง `main` เมื่อ 2026-10-23)
