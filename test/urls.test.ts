import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sendApiRequest } from "../src/http/client.js";
import {
  assertEndpointShape,
  baseUrlFor,
  buildUrl,
  endpoints,
  getEndpoint,
  getService,
  UrlBuildError,
  type Endpoint,
} from "../src/urls/index.js";

const BASE = "https://api.example.test";

const getItem: Endpoint = {
  id: "items.get",
  group: "items",
  method: "GET",
  summary: "Get one item.",
  path: "/v1/items/{itemId}/parts/{partId}",
  service: "example",
  pathParams: [
    { name: "itemId", description: "Item id." },
    { name: "partId", description: "Part id." },
  ],
  queryParams: [
    { name: "country", description: "Country code.", required: true },
    { name: "segment", description: "Audience.", required: false },
  ],
};

describe("services", () => {
  it("builds the product ingestion base URL from PRODUCT_INGESTION_BASE_URL", () => {
    assert.equal(
      baseUrlFor("productIngestion", { PRODUCT_INGESTION_BASE_URL: "https://example.test/rp/pi/" }),
      "https://example.test/rp/pi",
    );
    assert.equal(
      baseUrlFor("productIngestion", {}),
      "https://graph.microsoft.com/rp/product-ingestion",
    );
    assert.equal(getService("productIngestion").resource, "https://graph.microsoft.com");
  });

  it("builds the products.list URL", () => {
    const built = buildUrl({ endpoint: getEndpoint("products.list"), baseUrl: "https://graph.microsoft.com/rp/product-ingestion" });
    assert.equal(
      built.url.toString(),
      "https://graph.microsoft.com/rp/product-ingestion/product?$version=2022-03-01-preview3",
    );
  });

  it("rejects an unknown service", () => {
    assert.throws(() => getService("missing"), UrlBuildError);
    assert.throws(() => baseUrlFor("missing", {}), UrlBuildError);
  });

  it("has a valid entry for every catalog endpoint", () => {
    const ids = endpoints.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const endpoint of endpoints) {
      assertEndpointShape(endpoint);
      assert.doesNotThrow(() => getService(endpoint.service));
    }
  });
});

describe("assertEndpointShape", () => {
  it("accepts a well-formed endpoint", () => {
    assert.doesNotThrow(() => assertEndpointShape(getItem));
  });

  it("rejects a placeholder without a declared path parameter", () => {
    assert.throws(
      () => assertEndpointShape({ ...getItem, pathParams: [getItem.pathParams[0]!] }),
      /does not declare/,
    );
  });

  it("rejects a query string in the path", () => {
    assert.throws(
      () => assertEndpointShape({ ...getItem, path: "/v1/items?x=1", pathParams: [] }),
      /absolute|query/,
    );
  });
});

describe("buildUrl", () => {
  it("encodes path parameters and appends declared query parameters", () => {
    const built = buildUrl({
      endpoint: getItem,
      baseUrl: BASE,
      pathParams: { itemId: "abc", partId: "00 01" },
      query: { country: "US" },
    });
    assert.equal(built.url.toString(), `${BASE}/v1/items/abc/parts/00%2001?country=US`);
    assert.equal(built.method, "GET");
  });

  it("requires declared path and query parameters", () => {
    assert.throws(
      () => buildUrl({ endpoint: getItem, baseUrl: BASE, query: { country: "US" } }),
      /Missing path parameter "itemId".*--param itemId=<value>/,
    );
    assert.throws(
      () =>
        buildUrl({
          endpoint: getItem,
          baseUrl: BASE,
          pathParams: { itemId: "a", partId: "b" },
        }),
      /Missing query parameter "country".*--query country=<value>/,
    );
  });

  it("rejects unknown query parameters unless strict mode is off", () => {
    const input = {
      endpoint: getItem,
      baseUrl: BASE,
      pathParams: { itemId: "a", partId: "b" },
      query: { country: "US", filter: "x" },
    };
    assert.throws(() => buildUrl(input), UrlBuildError);
    const built = buildUrl({ ...input, strictQuery: false });
    assert.equal(built.url.searchParams.get("filter"), "x");
  });

  it("rejects a path parameter passed as a query parameter", () => {
    assert.throws(
      () =>
        buildUrl({
          endpoint: getItem,
          baseUrl: BASE,
          pathParams: { itemId: "a", partId: "b" },
          query: { country: "US", itemId: "a" },
          strictQuery: false,
        }),
      /path parameter/,
    );
  });

  it("keeps the path of a base URL", () => {
    const built = buildUrl({
      endpoint: getItem,
      baseUrl: `${BASE}/rp/workload/`,
      pathParams: { itemId: "a", partId: "b" },
      query: { country: "US" },
    });
    assert.equal(built.url.toString(), `${BASE}/rp/workload/v1/items/a/parts/b?country=US`);
  });

  it("rejects a base URL that is not https or has a query", () => {
    const input = { endpoint: getItem, pathParams: { itemId: "a", partId: "b" }, query: { country: "US" } };
    assert.throws(() => buildUrl({ ...input, baseUrl: `${BASE}?x=1` }), UrlBuildError);
    assert.throws(() => buildUrl({ ...input, baseUrl: "http://api.example.test" }), UrlBuildError);
  });

  it("sends query defaults and keeps a literal $ in OData names", () => {
    const endpoint: Endpoint = {
      ...getItem,
      path: "/items",
      pathParams: [],
      queryParams: [
        { name: "$version", description: "Schema.", required: true, default: "2022-03-01-preview3" },
        { name: "type", description: "Type.", required: false },
      ],
    };
    const defaulted = buildUrl({ endpoint, baseUrl: BASE });
    assert.equal(defaulted.url.toString(), `${BASE}/items?$version=2022-03-01-preview3`);
    const overridden = buildUrl({
      endpoint,
      baseUrl: BASE,
      query: { $version: "2023-01-01", type: "a b&c" },
    });
    assert.equal(overridden.url.toString(), `${BASE}/items?$version=2023-01-01&type=a%20b%26c`);
    assert.equal(overridden.url.searchParams.get("type"), "a b&c");
  });
});

describe("sendApiRequest", () => {
  it("sends the auth and tracing headers and returns the response body", async () => {
    let seenAuthorization = "";
    let seenRequestId = "";
    const response = await sendApiRequest({
      url: new URL(`${BASE}/v1/items`),
      method: "GET",
      accessToken: "secret-token",
      locale: "en-US",
      fetchImpl: async (_url, init) => {
        const headers = new Headers(init?.headers);
        seenAuthorization = headers.get("Authorization") ?? "";
        seenRequestId = headers.get("MS-RequestId") ?? "";
        assert.equal(headers.get("Accept"), "application/json");
        assert.equal(headers.get("X-Locale"), "en-US");
        assert.match(headers.get("MS-CorrelationId") ?? "", /^[0-9a-f-]{36}$/);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "MS-RequestId": "response-request-id" },
        });
      },
    });

    assert.equal(seenAuthorization, "Bearer secret-token");
    assert.match(seenRequestId, /^[0-9a-f-]{36}$/);
    assert.equal(response.status, 200);
    assert.equal(response.requestId, "response-request-id");
    assert.equal(response.bodyText, JSON.stringify({ ok: true }));
  });

  it("rejects an empty token before calling fetch", async () => {
    await assert.rejects(
      () =>
        sendApiRequest({
          url: new URL(`${BASE}/v1/items`),
          method: "GET",
          accessToken: "  ",
          fetchImpl: () => {
            throw new Error("fetch should not be called");
          },
        }),
      /Missing access token/,
    );
  });
});
