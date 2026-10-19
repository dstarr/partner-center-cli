import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { AuthManager } from "../src/auth/auth-manager.js";
import { PrivateOfferCollection, PrivateOfferListCriteria } from "../src/services/private-offer-collection.js";
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

describe("PrivateOffersService.withdrawPrivateOffer", () => {
  beforeEach(() => {
    process.env.PRODUCT_INGESTION_BASE_URL = BASE;
  });

  afterEach(() => {
    delete process.env.PRODUCT_INGESTION_BASE_URL;
  });

  it("posts a minimal configure body with state draft", async () => {
    let configureBody = "";
    const offer = {
      $schema: "https://schema.mp.microsoft.com/schema/private-offer/2023-07-15",
      id: "private-offer/abc",
      name: "Test",
      privateOfferType: "customerPromotion",
      offerPricingType: "editExistingOfferPricingOnly",
      state: "live",
      notificationContacts: ["david@example.com"],
    };
    const service = new PrivateOffersService({
      auth: fakeAuth(),
      fetchImpl: async (url, init) => {
        const href = String(url);
        if (href.includes("/private-offer/abc") && !href.includes("configure")) {
          return json(offer);
        }
        if (href.includes("/configure")) {
          configureBody = String(init?.body ?? "");
          return json({ jobId: "job-1", jobStatus: "completed", jobResult: "succeeded", errors: [] });
        }
        throw new Error(`Unexpected URL: ${href}`);
      },
    });

    await service.withdrawPrivateOffer("abc");

    const posted = JSON.parse(configureBody) as { resources: { state: string }[] };
    assert.equal(posted.resources[0]?.state, "draft");
    assert.equal(posted.resources[0]?.offerPricingType, "editExistingOfferPricingOnly");
    assert.equal(posted.resources[0]?.notificationContacts, undefined);
  });
});

describe("PrivateOfferCollection", () => {
  const offers = [
    { name: "Contoso Demo", state: "draft", subState: "pendingAcceptance", privateOfferType: "customerPromotion" },
    { name: "Fabrikam Offer", state: "live", subState: "active", privateOfferType: "customerPromotion" },
  ] as const;

  function filtered(filters: Parameters<typeof PrivateOfferListCriteria.from>[0]) {
    return new PrivateOfferCollection(offers).apply(PrivateOfferListCriteria.from(filters)).toArray();
  }

  it("filters by name, state, and subState", () => {
    assert.deepEqual(filtered({ name: "contoso" }), [offers[0]]);
    assert.deepEqual(filtered({ state: "live" }), [offers[1]]);
    assert.deepEqual(filtered({ subState: "active" }), [offers[1]]);
    assert.deepEqual(filtered({ name: "Offer", state: "live" }), [offers[1]]);
    assert.deepEqual(filtered({}), [...offers]);
  });
});
