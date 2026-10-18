const DEFAULT_SCHEMA_BASE_URL = "https://schema.mp.microsoft.com";
const SchemaBaseUrl = process.env["SCHEMA_BASE_URL"]?.trim() || DEFAULT_SCHEMA_BASE_URL;

/** Builds `$schema` URLs from `SCHEMA_BASE_URL` (or the Microsoft default). */
export class MarketplaceSchemasRegistry {

  public static readonly Schemas = {
    CommercialMarketplaceSetup: `${SchemaBaseUrl}/schema/commercial-marketplace-setup/2026-10-01`,
    Configure: `${SchemaBaseUrl}/schema/configure/2026-10-01`,
    CustomerLeads: `${SchemaBaseUrl}/schema/customer-leads/2026-10-01`,
    Listing: `${SchemaBaseUrl}/schema/listing/2026-10-01`,
    ListingAsset: `${SchemaBaseUrl}/schema/listing-asset/2026-10-01`,
    Microsoft365Integration: `${SchemaBaseUrl}/schema/microsoft365-integration/2026-10-01`,
    Plan: `${SchemaBaseUrl}/schema/plan/2026-10-01`,
    PlanListing: `${SchemaBaseUrl}/schema/plan-listing/2026-10-01`,
    PriceAndAvailabilityCustomMeter: `${SchemaBaseUrl}/schema/price-and-availability-custom-meter/2026-10-01-preview2`,
    PriceAndAvailabilityOffer: `${SchemaBaseUrl}/schema/price-and-availability-offer/2026-10-01-preview2`,
    PriceAndAvailabilityPlan: `${SchemaBaseUrl}/schema/price-and-availability-plan/2026-10-01-preview2`,
    Product: `${SchemaBaseUrl}/schema/product/2026-10-01`,
    Property: `${SchemaBaseUrl}/schema/property/2026-10-01`,
    Reseller: `${SchemaBaseUrl}/schema/reseller/2026-10-01-preview2`,
    SoftwareAsAServiceTechnicalConfiguration: `${SchemaBaseUrl}/schema/software-as-a-service-technical-configuration/2026-10-01`,
    Submission: `${SchemaBaseUrl}/schema/submission/2022-03-01-preview2`,
  } as const;
}

export type MarketplaceSchema = keyof typeof MarketplaceSchemasRegistry.Schemas;
