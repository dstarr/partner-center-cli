import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PrivateOfferStatePayloadBuilder } from "../src/services/private-offer-state-payload.js";
import { PrivateOfferSchemas } from "../src/services/private-offer-types.js";

describe("PrivateOfferStatePayloadBuilder", () => {
  const builder = new PrivateOfferStatePayloadBuilder();

  it("builds withdraw payload for customerPromotion with offerPricingType", () => {
    const payload = builder.buildWithdrawPayload({
      $schema: PrivateOfferSchemas.PrivateOffer,
      id: "private-offer/abc",
      name: "Offer",
      privateOfferType: "customerPromotion",
      state: "live",
      offerPricingType: "editExistingOfferPricingOnly",
      extraField: "ignored",
    });

    assert.deepEqual(payload, {
      $schema: PrivateOfferSchemas.PrivateOffer,
      id: "private-offer/abc",
      name: "Offer",
      privateOfferType: "customerPromotion",
      offerPricingType: "editExistingOfferPricingOnly",
      state: "draft",
    });
  });

  it("builds withdraw payload for cspPromotion without offerPricingType", () => {
    const payload = builder.buildWithdrawPayload({
      $schema: PrivateOfferSchemas.PrivateOffer,
      id: "private-offer/csp-1",
      name: "CSP offer",
      privateOfferType: "cspPromotion",
      state: "live",
      beneficiaries: [{ id: "tenant", description: "x" }],
    });

    assert.deepEqual(payload, {
      $schema: PrivateOfferSchemas.PrivateOffer,
      id: "private-offer/csp-1",
      name: "CSP offer",
      privateOfferType: "cspPromotion",
      state: "draft",
    });
  });
});
