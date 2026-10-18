const DEFAULT_SCHEMA_BASE_URL = "https://schema.mp.microsoft.com/schema";
const SchemaBaseUrl = process.env["SCHEMA_BASE_URL"]?.trim() || DEFAULT_SCHEMA_BASE_URL;

/** Builds `$schema` URLs from `SCHEMA_BASE_URL` (or the Microsoft default). */
export class MarketplaceSchemasRegistry {

  public static readonly Schemas = {
    CommercialMarketplaceSetup: `${SchemaBaseUrl}/commercial-marketplace-setup/2026-10-01`,
    Configure: `${SchemaBaseUrl}/configure/2026-10-01`,
    CustomerLeads: `${SchemaBaseUrl}/customer-leads/2026-10-01`,
    Listing: `${SchemaBaseUrl}/listing/2026-10-01`,
    ListingAsset: `${SchemaBaseUrl}/listing-asset/2026-10-01`,
    Microsoft365Integration: `${SchemaBaseUrl}/microsoft365-integration/2026-10-01`,
    Plan: `${SchemaBaseUrl}/plan/2026-10-01`,
    PlanListing: `${SchemaBaseUrl}/plan-listing/2026-10-01`,
    PriceAndAvailabilityCustomMeter: `${SchemaBaseUrl}/price-and-availability-custom-meter/2026-10-01-preview2`,
    PriceAndAvailabilityOffer: `${SchemaBaseUrl}/price-and-availability-offer/2026-10-01-preview2`,
    PriceAndAvailabilityPlan: `${SchemaBaseUrl}/price-and-availability-plan/2026-10-01-preview2`,
    Product: `${SchemaBaseUrl}/product/2026-10-01`,
    Property: `${SchemaBaseUrl}/property/2026-10-01`,
    Reseller: `${SchemaBaseUrl}/reseller/2026-10-01-preview2`,
    SoftwareAsAServiceTechnicalConfiguration: `${SchemaBaseUrl}/software-as-a-service-technical-configuration/2026-10-01`,
    Submission: `${SchemaBaseUrl}/submission/2022-03-01-preview2`,
  } as const;
}

export type MarketplaceSchema = keyof typeof MarketplaceSchemasRegistry.Schemas;
