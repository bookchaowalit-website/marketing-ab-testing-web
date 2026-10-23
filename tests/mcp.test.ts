import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/mcp/route";
import { SEED } from "@/lib/ab-testing";

function rpc(body: unknown) {
  return POST(new Request("http://localhost/api/mcp", { method: "POST", body: JSON.stringify(body) }));
}

describe("MCP route", () => {
  it("echoes the JSON-RPC request id", async () => {
    const res = await rpc({ jsonrpc: "2.0", id: 7, method: "tools/list" });
    expect((await res.json()).id).toBe(7);
  });

  it("lists the real tools", async () => {
    const res = await rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    const { result } = await res.json();
    expect(result.tools.map((t: { name: string }) => t.name)).toEqual(["get_seed_experiment", "summarize", "simulate"]);
  });

  it("get_seed_experiment returns the seed variants with rates and the leader", async () => {
    const res = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "get_seed_experiment" } });
    const { result } = await res.json();
    expect(result.variants.map((v: { id: string }) => v.id)).toEqual(SEED.map((v) => v.id));
    expect(result.leader).toBe("signal");
    expect(result.allocation).toBe(100);
  });

  it("summarize works on caller-supplied variants and rejects bad ones", async () => {
    const variants = [{ id: "a", name: "A", weight: 50, conversions: 1, views: 10 }, { id: "b", name: "B", weight: 50, conversions: 3, views: 10 }];
    const ok = await (await rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "summarize", arguments: { variants } } })).json();
    expect(ok.result).toMatchObject({ leader: "b", views: 20, conversions: 4, allocation: 100 });
    const bad = await (await rpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "summarize", arguments: { variants: [{ id: 1 }] } } })).json();
    expect(bad.error.code).toBe(-32602);
    expect(bad.id).toBe(4);
  });

  it("simulate adds exactly the requested visits and stores nothing", async () => {
    const res = await rpc({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "simulate", arguments: { rounds: 25 } } });
    const { result } = await res.json();
    const views = (list: { views: number }[]) => list.reduce((sum, v) => sum + v.views, 0);
    expect(views(result.variants)).toBe(views(SEED) + 25);
    const again = await (await rpc({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "get_seed_experiment" } })).json();
    expect(views(again.result.variants)).toBe(views(SEED));
  });

  it("rejects an out-of-range round count", async () => {
    const res = await rpc({ jsonrpc: "2.0", id: 8, method: "tools/call", params: { name: "simulate", arguments: { rounds: 100000 } } });
    expect((await res.json()).error.code).toBe(-32602);
  });

  it("rejects an unknown tool instead of pretending to call it", async () => {
    const res = await rpc({ jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: "delete_all" } });
    expect((await res.json()).error.code).toBe(-32602);
  });

  it("rejects an unknown method and bad JSON", async () => {
    expect((await (await rpc({ jsonrpc: "2.0", id: 10, method: "nope" })).json()).error.code).toBe(-32601);
    const res = await POST(new Request("http://localhost/api/mcp", { method: "POST", body: "{" }));
    expect((await res.json()).error.code).toBe(-32700);
  });
});
