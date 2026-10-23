import { NextResponse } from "next/server";
import { SEED, parseVariants, simulate, summarize, type Variant } from "@/lib/ab-testing";

// Stateless JSON-RPC MCP endpoint over the same simulator logic the page uses. It never stores anything: the
// page's experiment lives in the visitor's browser, so tools work on the seed or on variants the caller sends.

type RpcRequest = { id?: number | string | null; method?: string; params?: { name?: string; arguments?: Record<string, unknown> } };

const MAX_ROUNDS = 1000;
const variantsSchema = {
  type: "array",
  items: {
    type: "object",
    properties: { id: { type: "string" }, name: { type: "string" }, weight: { type: "number" }, conversions: { type: "number" }, views: { type: "number" } },
    required: ["id", "name", "weight", "conversions", "views"],
  },
};

const TOOLS = [
  { name: "get_seed_experiment", description: "The seed variants the page starts with, with rates, allocation and leader", inputSchema: { type: "object", properties: {} } },
  { name: "summarize", description: "Rates, totals, allocation and leader for the given variants (no significance test)", inputSchema: { type: "object", properties: { variants: variantsSchema }, required: ["variants"] } },
  {
    name: "simulate",
    description: `Add 1-${MAX_ROUNDS} weighted random visits to the given variants (or the seed); nothing is stored`,
    inputSchema: { type: "object", properties: { rounds: { type: "integer", minimum: 1, maximum: MAX_ROUNDS }, variants: variantsSchema }, required: ["rounds"] },
  },
];

class RpcError extends Error {
  constructor(readonly code: number, message: string) {
    super(message);
  }
}

function readVariants(value: unknown, fallback?: Variant[]): Variant[] {
  if (value === undefined && fallback) return fallback;
  const variants = parseVariants(JSON.stringify(value ?? null));
  if (!variants) throw new RpcError(-32602, "variants must be a non-empty list of {id, name, weight, conversions, views}");
  return variants;
}

function callTool(name: string | undefined, args: Record<string, unknown> = {}) {
  switch (name) {
    case "get_seed_experiment":
      return summarize(SEED);
    case "summarize":
      return summarize(readVariants(args.variants));
    case "simulate": {
      const rounds = args.rounds;
      if (typeof rounds !== "number" || !Number.isInteger(rounds) || rounds < 1 || rounds > MAX_ROUNDS) {
        throw new RpcError(-32602, `rounds must be an integer from 1 to ${MAX_ROUNDS}`);
      }
      return summarize(simulate(readVariants(args.variants, SEED), rounds));
    }
    default:
      throw new RpcError(-32602, `Unknown tool: ${String(name)}`);
  }
}

export async function POST(request: Request) {
  let id: RpcRequest["id"] = null;
  try {
    const body = (await request.json()) as RpcRequest;
    id = body.id ?? null;
    let result: unknown;
    switch (body.method) {
      case "initialize":
        result = { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "Split Room A/B simulator", version: "1.0.0" } };
        break;
      case "tools/list":
        result = { tools: TOOLS };
        break;
      case "tools/call":
        result = callTool(body.params?.name, body.params?.arguments);
        break;
      default:
        throw new RpcError(-32601, `Unknown method: ${String(body.method)}`);
    }
    return NextResponse.json({ jsonrpc: "2.0", id, result });
  } catch (error) {
    const code = error instanceof RpcError ? error.code : -32700;
    const message = error instanceof RpcError ? error.message : "Parse error";
    return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } }, { status: 400 });
  }
}
