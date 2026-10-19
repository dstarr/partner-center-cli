import { PrivateOfferSchemas, type PrivateOffer } from "./private-offer-types.js";

/** Builds draft private-offer resources for configure requests. */
export class PrivateOfferFactory {

  public async createPrivateOffer(name: string): Promise<PrivateOffer> {
    const endDateString = this.defaultEndDateString();
    return {
      $schema: PrivateOfferSchemas.PrivateOffer as string,
      name,
      state: "draft",
      privateOfferType: "customerPromotion",
      offerPricingType: "editExistingOfferPricingOnly",
      customerContractRenewal: false,
      variableStartDate: true,
      end: endDateString,
      acceptBy: endDateString,
      preparedBy: "david@cumulus26.com",
      notificationContacts: ["david@cumulus26.com"],
    } as PrivateOffer;
  }

  private defaultEndDateString(): string {
    const endDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    return endDate.toISOString().slice(0, 10);
  }
}
