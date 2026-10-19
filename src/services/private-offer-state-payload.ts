import type { PrivateOffer } from "./private-offer-types.js";
import { PrivateOfferSchemas } from "./private-offer-types.js";

/**
 * Builds minimal private-offer resources for configure state transitions.
 * @see https://learn.microsoft.com/en-us/partner-center/marketplace-offers/manage-existing-private-offers-via-api
 */
export class PrivateOfferStatePayloadBuilder {

  public buildWithdrawPayload(offer: PrivateOffer): PrivateOffer {
    return this.buildPayload(offer, "draft");
  }

  public buildDeletePayload(offer: PrivateOffer): PrivateOffer {
    return this.buildPayload(offer, "deleted");
  }

  private buildPayload(offer: PrivateOffer, state: string): PrivateOffer {
    if (offer.id === undefined || offer.id.trim().length === 0) {
      throw new Error("Private offer id is required for configure.");
    }
    if (offer.name.trim().length === 0) {
      throw new Error("Private offer name is required for configure.");
    }

    const payload: PrivateOffer = {
      $schema: PrivateOfferSchemas.PrivateOffer,
      id: offer.id,
      name: offer.name,
      privateOfferType: offer.privateOfferType,
      state,
    };

    const offerPricingType = this.readOfferPricingType(offer);
    if (offer.privateOfferType === "customerPromotion") {
      if (offerPricingType === undefined) {
        throw new Error(
          "customerPromotion private offers require offerPricingType; re-fetch the offer with private-offers get.",
        );
      }
      payload.offerPricingType = offerPricingType;
    }

    return payload;
  }

  private readOfferPricingType(offer: PrivateOffer): string | undefined {
    const value = offer.offerPricingType;
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
  }
}
