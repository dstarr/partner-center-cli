const DEFAULT_SCHEMA_BASE_URL = "https://schema.mp.microsoft.com";
const SchemaBaseUrl = process.env["SCHEMA_BASE_URL"]?.trim() || DEFAULT_SCHEMA_BASE_URL;

/** Builds `$schema` URLs from `SCHEMA_BASE_URL` (or the Microsoft default). */
export class MarketplaceSchemasRegistry {

  public static readonly Schemas = {
    CommercialMarketplaceSetup: `${SchemaBaseUrl}/schema/commercial-marketplace-setup/2022-03-01-preview2`,
    Configure: `${SchemaBaseUrl}/schema/configure/2022-03-01-preview2`,
    CustomerLeads: `${SchemaBaseUrl}/schema/customer-leads/2022-03-01-preview3`,
    Listing: `${SchemaBaseUrl}/schema/listing/2022-03-01-preview3`,
    ListingAsset: `${SchemaBaseUrl}/schema/listing-asset/2022-03-01-preview3`,
    Microsoft365Integration: `${SchemaBaseUrl}/schema/microsoft365-integration/2022-03-01-preview2`,
    Plan: `${SchemaBaseUrl}/schema/plan/2022-03-01-preview3`,
    PlanListing: `${SchemaBaseUrl}/schema/plan-listing/2022-03-01-preview3`,
    PriceAndAvailabilityCustomMeter: `${SchemaBaseUrl}/schema/price-and-availability-custom-meter/2022-03-01-preview3`,
    PriceAndAvailabilityOffer: `${SchemaBaseUrl}/schema/price-and-availability-offer/2022-03-01-preview3`,
    PriceAndAvailabilityPlan: `${SchemaBaseUrl}/schema/price-and-availability-plan/2022-03-01-preview4`,
    Product: `${SchemaBaseUrl}/schema/product/2022-03-01-preview3`,
    Property: `${SchemaBaseUrl}/schema/property/2022-03-01-preview3`,
    Reseller: `${SchemaBaseUrl}/schema/reseller/2022-03-01-preview2`,
    SoftwareAsAServiceTechnicalConfiguration: `${SchemaBaseUrl}/schema/software-as-a-service-technical-configuration/2022-03-01-preview3`,
    Submission: `${SchemaBaseUrl}/schema/submission/2022-03-01-preview2`,
  } as const;
}

export type MarketplaceSchema = keyof typeof MarketplaceSchemasRegistry.Schemas;
