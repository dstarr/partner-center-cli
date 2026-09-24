import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sendPartnerCenterRequest } from "../src/http/client.js";
import {
  baseUrlFor,
  buildUrl,
  endpoints,
  getEndpoint,
  services,
  UrlBuildError,
} from "../src/urls/index.js";

describe("catalog", () => {
  it("publishes the official partner center hosts", () => {
    assert.equal(
      services.partnerCenter.bases.global,
      "https://api.partnercenter.microsoft.com",
    );
    assert.equal(
      services.partnerCenter.bases.china,
      "https://partner.partnercenterapi.microsoftonline.cn",
    );
    assert.equal(services.partner.bases.global, "https://api.partner.microsoft.com");
  });

  it("rejects the china host for pricing and referrals", () => {
    assert.throws(() => baseUrlFor("partner", "china"), UrlBuildError);
  });

  it("uses unique endpoint ids", () => {
    const ids = endpoints.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});

describe("buildUrl", () => {
  it("builds a customer URL on the global host", () => {
    const built = buildUrl({
      endpoint: getEndpoint("customers.get"),
      pathParams: { customerId: "aaaabbbb-0000-cccc-1111-dddd2222eeee" },
    });
    assert.equal(
      built.url.toString(),
      "https://api.partnercenter.microsoft.com/v1/customers/aaaabbbb-0000-cccc-1111-dddd2222eeee",
    );
  });

  it("uses the China host when asked", () => {
    const built = buildUrl({
      endpoint: getEndpoint("profiles.organization.get"),
      cloud: "china",
    });
    assert.equal(
      built.url.toString(),
      "https://partner.partnercenterapi.microsoftonline.cn/v1/profiles/organization",
    );
  });

  it("encodes path parameters and appends declared query parameters", () => {
    const built = buildUrl({
      endpoint: getEndpoint("products.skus.get"),
      pathParams: { productId: "CFQ7TTC0LH18", skuId: "00 01" },
      query: { country: "US" },
    });
    assert.equal(
      built.url.toString(),
      "https://api.partnercenter.microsoft.com/v1/products/CFQ7TTC0LH18/skus/00%2001?country=US",
    );
  });

  it("requires declared query parameters", () => {
    assert.throws(
      () => buildUrl({ endpoint: getEndpoint("customers.list") }),
      /Missing query parameter "size"/,
    );
  });

  it("rejects unknown query parameters unless strict mode is off", () => {
    const endpoint = getEndpoint("customers.list");
    assert.throws(
      () => buildUrl({ endpoint, query: { size: 40, filter: "x" } }),
      UrlBuildError,
    );
    const built = buildUrl({
      endpoint,
      query: { size: 40, filter: "x" },
      strictQuery: false,
    });
    assert.equal(built.url.searchParams.get("size"), "40");
    assert.equal(built.url.searchParams.get("filter"), "x");
  });

  it("rejects a path parameter passed as a query parameter", () => {
    assert.throws(
      () =>
        buildUrl({
          endpoint: getEndpoint("customers.get"),
          query: { customerId: "abc" },
          strictQuery: false,
        }),
      /path parameter/,
    );
  });

  it("accepts an https origin override", () => {
    const built = buildUrl({
      endpoint: getEndpoint("profiles.organization.get"),
      baseUrl: "https://example.test",
    });
    assert.equal(built.url.origin, "https://example.test");
  });

  it("rejects a base URL with a path", () => {
    assert.throws(
      () =>
        buildUrl({
          endpoint: getEndpoint("profiles.organization.get"),
          baseUrl: "https://example.test/v2",
        }),
      UrlBuildError,
    );
  });

  it("can build every catalog endpoint from its required parameters", () => {
    for (const endpoint of endpoints) {
      const pathParams: Record<string, string> = {};
      for (const param of endpoint.pathParams) {
        pathParams[param.name] = `${param.name}-value`;
      }
      const query: Record<string, string> = {};
      for (const param of endpoint.queryParams) {
        if (param.required) {
          query[param.name] = `${param.name}-value`;
        }
      }
      const built = buildUrl({ endpoint, pathParams, query });
      assert.equal(built.method, endpoint.method);
      assert.equal(built.url.origin, services.partnerCenter.bases.global);
      for (const param of endpoint.pathParams) {
        assert.equal(built.url.pathname.includes(`{${param.name}}`), false);
        assert.match(built.url.pathname, new RegExp(param.name));
      }
    }
  });
});

describe("sendPartnerCenterRequest", () => {
  it("sends Partner Center headers and returns the response body", async () => {
    let seenAuthorization = "";
    let seenRequestId = "";
    const response = await sendPartnerCenterRequest({
      url: new URL("https://api.partnercenter.microsoft.com/v1/profiles/organization"),
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
        sendPartnerCenterRequest({
          url: new URL("https://api.partnercenter.microsoft.com/v1/profiles/organization"),
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
