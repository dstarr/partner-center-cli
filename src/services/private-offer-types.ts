/** `$schema` URLs used by private offer resources. */
export enum PrivateOfferSchemas {
  PrivateOffer = "https://schema.mp.microsoft.com/schema/private-offer/2023-07-15",
  /** Envelope for `/configure` requests; must match the endpoint's `$version`. */
  Configure = "https://schema.mp.microsoft.com/schema/configure/2022-07-01",
}

/** A private offer summary from the Product Ingestion API. */
export interface PrivateOffer {
  $schema: PrivateOfferSchemas.PrivateOffer;
  /** Durable id, such as `private-offer/77915369-...`. */
  id?: string;
  name: string;
  /** Such as `customerPromotion`, `cspPromotion`, or `multipartyPromotionOriginator`. */
  privateOfferType: string;
  /** Such as `draft`, `live`, or `deleted`. List views may show `withdrawn`; withdraw via API sets `draft`. */
  state: string;
  offerPricingType?: string;
  subState?: string;
  variableStartDate?: boolean;
  start?: string;
  end?: string;
  acceptBy?: string;
  lastModified?: string;
  [property: string]: unknown;
}

/** A private offer configuration from the Product Ingestion API. */
export interface PrivateOfferConfiguration {
  $schema: PrivateOfferSchemas.Configure;
  resources: PrivateOffer[];
}

export interface PrivateOfferListFilter {
  name?: string;
  state?: string;
  subState?: string;
}
