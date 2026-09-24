import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthManager } from "../src/auth/manager.js";
import { ApiError } from "../src/http/pages.js";
import { ProductsService } from "../src/services/ProductsService.js";

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

describe("ProductsService.getProduct", () => {
  const tree = {
    $schema: "https://schema.mp.microsoft.com/schema/resource-tree/2022-03-01-preview2",
    root: "product/abc",
    target: { targetType: "preview" },
    resources: [{ $schema: "https://schema.mp.microsoft.com/schema/product/2022-03-01-preview3", id: "product/abc" }],
  };

  it("calls the resource-tree URL with an unquoted targetType", async () => {
    let seen = "";
    const manager = new ProductsService({
      auth: fakeAuth(),
      baseUrl: `${BASE}/resource-tree`,
      fetchImpl: async (url) => {
        seen = String(url);
        return json(tree);
      },
    });

    const result = await manager.getProduct("product/abc", { targetType: "preview" });

    assert.equal(
      seen,
      `${BASE}/resource-tree/product/abc?targetType=preview&$version=2022-03-01-preview5`,
    );
    assert.equal(result.root, "product/abc");
    assert.equal(result.resources.length, 1);
  });

  it("omits targetType to read the draft", async () => {
    let seen = "";
    const manager = new ProductsService({
      auth: fakeAuth(),
      baseUrl: `${BASE}/resource-tree`,
      fetchImpl: async (url) => {
        seen = String(url);
        return json(tree);
      },
    });
    await manager.getProduct("abc");
    assert.equal(seen, `${BASE}/resource-tree/product/abc?$version=2022-03-01-preview5`);
  });

  it("rejects an empty id and an unknown target type", async () => {
    const manager = new ProductsService({ auth: fakeAuth(), baseUrl: BASE, fetchImpl: async () => json(tree) });
    await assert.rejects(manager.getProduct("product/"), /Product id is required/);
    await assert.rejects(
      manager.getProduct("abc", { targetType: '"preview"' as never }),
      /targetType must be one of/,
    );
  });

  it("throws ApiError when the product has no live submission", async () => {
    const manager = new ProductsService({
      auth: fakeAuth(),
      baseUrl: BASE,
      fetchImpl: async () => json({ error: { code: "badRequest" } }, 400),
    });
    await assert.rejects(manager.getProduct("abc", { targetType: "live" }), (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal((error as ApiError).response.status, 400);
      return true;
    });
  });

  it("getProductResourceSchemas returns each resource's $schema", async () => {
    const manager = new ProductsService({ auth: fakeAuth(), baseUrl: BASE, fetchImpl: async () => json(tree) });
    assert.deepEqual(await manager.getProductResourceSchemas("abc", { targetType: "preview" }), [
      "https://schema.mp.microsoft.com/schema/product/2022-03-01-preview3",
    ]);
  });
});

describe("ProductsService.getAllProducts", () => {
  it("calls the products.list URL and merges every page", async () => {
    const seen: string[] = [];
    const manager = new ProductsService({
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
    const manager = new ProductsService({
      auth: fakeAuth(),
      baseUrl: BASE,
      fetchImpl: async () =>
        json({ value: [], "@nextLink": "https://evil.example.test/product?continuationToken=x" }),
    });
    await assert.rejects(manager.getAllProducts(), /another host/);
  });

  it("throws ApiError with the failed response", async () => {
    const manager = new ProductsService({
      auth: fakeAuth(),
      baseUrl: BASE,
      fetchImpl: async () => json({ error: "forbidden" }, 403),
    });
    await assert.rejects(manager.getAllProducts(), (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal((error as ApiError).response.status, 403);
      return true;
    });
  });
});
