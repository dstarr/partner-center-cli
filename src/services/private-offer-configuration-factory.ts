import { PrivateOfferSchemas, type PrivateOffer } from "./private-offers-service.js";

/**
 * This factory is used to create a private offer configuration.
 * It is used to create a private offer configuration for a given product.
 */
export class PrivateOfferFactory {

  async createPrivateOffer(name: string): Promise<PrivateOffer> {

    const endDate: Date = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 1 month from now
    const endDateString: string = endDate.toISOString().slice(0, 10);

    return {
              "$schema": PrivateOfferSchemas.PrivateOffer as string,
              "name": name,
              "state": "draft",
              "privateOfferType": "customerPromotion",
              "offerPricingType": "editExistingOfferPricingOnly",
              "customerContractRenewal": false,
              "variableStartDate": true,
              "end": endDateString,
              "acceptBy": endDateString,
              "preparedBy": "david@cumulus26.com",
              "notificationContacts": [ "david@cumulus26.com" ],
            } as PrivateOffer;
    }
}