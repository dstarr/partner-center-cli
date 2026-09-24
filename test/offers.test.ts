import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthManager } from "../src/auth/manager.js";
import { ApiError } from "../src/http/pages.js";
import { OffersManager } from "../src/offers/manager.js";

const BASE = "https://graph.example.test/rp/product-ingestion";

function fakeAuth(): AuthManager {
  return new AuthManager({
    tenantId: "contoso.onmicrosoft.com",
    clientId: "client-id",
    clientSecret: "secret",
    resource: "https://graph.microsoft.com",
    fetchImpl: async () =>
      new Response(JSON.stringify({ access_token: "token", expires_in: "3600" }), { status: 200 }),
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("OffersManager.getAllProducts", () => {
  it("calls the products.list URL and merges every page", async () => {
    const seen: string[] = [];
    const manager = new OffersManager({
      auth: fakeAuth(),
      baseUrl: BASE,
      fetchImpl: async (url, init) => {
        seen.push(String(url));
        assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer token");
        if (seen.length === 1) {
          return json({
            value: [{ id: "product/1", type: "softwareAsAService", alias: "One" }],
            "@nextLink": `${BASE}/product?$version=2022-03-01-preview3&continuationToken=abc`,
          });
        }
        return json({ value: [{ id: "product/2", type: "softwareAsAService", alias: "Two" }] });
      },
    });

    const products = await manager.getAllProducts();

    assert.deepEqual(
      products.map((product) => product.id),
      ["product/1", "product/2"],
    );
    assert.deepEqual(seen, [
      `${BASE}/product?$version=2022-03-01-preview3`,
      `${BASE}/product?$version=2022-03-01-preview3&continuationToken=abc`,
    ]);
  });

  it("refuses to follow a next link to another host", async () => {
    const manager = new OffersManager({
      auth: fakeAuth(),
      baseUrl: BASE,
      fetchImpl: async () =>
        json({ value: [], "@nextLink": "https://evil.example.test/product?continuationToken=x" }),
    });
    await assert.rejects(manager.getAllProducts(), /another host/);
  });

  it("throws ApiError with the failed response", async () => {
    const manager = new OffersManager({
      auth: fakeAuth(),
      baseUrl: BASE,
      fetchImpl: async () => json({ error: "forbidden" }, 403),
    });
    await assert.rejects(manager.getAllProducts(), (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.response.status, 403);
      return true;
    });
  });
});
