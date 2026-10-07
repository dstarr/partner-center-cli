import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthManager } from "../src/auth/auth-manager.js";
import { PrivateOffersService } from "../src/services/private-offers-service.js";

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

describe("PrivateOffersService.getAllPrivateOffers", () => {
  it("reads the privateOffers array from every page", async () => {
    const seen: string[] = [];
    const service = new PrivateOffersService({
      auth: fakeAuth(),
      baseUrl: BASE,
      fetchImpl: async (url) => {
        seen.push(String(url));
        if (seen.length === 1) {
          return json({
            privateOffers: [{ id: "private-offer/1", name: "One", privateOfferType: "customerPromotion", state: "draft" }],
            "@nextLink": `${BASE}/private-offer?%24version=2023-07-15&continuationToken=abc`,
          });
        }
        return json({
          privateOffers: [{ id: "private-offer/2", name: "Two", privateOfferType: "customerPromotion", state: "live" }],
        });
      },
    });

    const offers = await service.getAllPrivateOffers();

    assert.deepEqual(
      offers.map((offer) => offer.id),
      ["private-offer/1", "private-offer/2"],
    );
    assert.deepEqual(seen, [
      `${BASE}/private-offer/query?$version=2023-07-15`,
      `${BASE}/private-offer?%24version=2023-07-15&continuationToken=abc`,
    ]);
  });

  it("rejects a page without a privateOffers array", async () => {
    const service = new PrivateOffersService({ auth: fakeAuth(), baseUrl: BASE, fetchImpl: async () => json({ value: [] }) });
    await assert.rejects(service.getAllPrivateOffers(), /privateOffers array/);
  });
});
