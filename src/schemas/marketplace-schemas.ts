import { normalizeBaseUrl } from "../urls/bases.js";

const DEFAULT_SCHEMA_BASE_URL = "https://schema.mp.microsoft.com";
const SCHEMA_BASE_URL_ENV = "SCHEMA_BASE_URL";

/** Builds `$schema` URLs from `SCHEMA_BASE_URL` (or the Microsoft default). */
export class MarketplaceSchemasRegistry {
  private static readonly Paths = {
    CommercialMarketplaceSetup: "commercial-marketplace-setup/2022-03-01-preview2",
    Configure: "configure/2022-03-01-preview2",
    CustomerLeads: "customer-leads/2022-03-01-preview3",
    Listing: "listing/2022-03-01-preview3",
    ListingAsset: "listing-asset/2022-03-01-preview3",
    Microsoft365Integration: "microsoft365-integration/2022-03-01-preview2",
    Plan: "plan/2022-03-01-preview3",
    PlanListing: "plan-listing/2022-03-01-preview3",
    PriceAndAvailabilityCustomMeter: "price-and-availability-custom-meter/2022-03-01-preview3",
    PriceAndAvailabilityOffer: "price-and-availability-offer/2022-03-01-preview3",
    PriceAndAvailabilityPlan: "price-and-availability-plan/2022-03-01-preview4",
    Product: "product/2022-03-01-preview3",
    Property: "property/2022-03-01-preview3",
    Reseller: "reseller/2022-03-01-preview2",
    SoftwareAsAServiceTechnicalConfiguration: "software-as-a-service-technical-configuration/2022-03-01-preview3",
    Submission: "submission/2022-03-01-preview2",
  } as const;

  private static envOverride: NodeJS.ProcessEnv | undefined;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    MarketplaceSchemasRegistry.envOverride = env;
  }

  static get Schemas(): Readonly<Record<MarketplaceSchemaKey, string>> {
    const base = `${MarketplaceSchemasRegistry.schemaBaseUrl()}/schema`;
    return Object.fromEntries(
      (Object.entries(MarketplaceSchemasRegistry.Paths) as [MarketplaceSchemaKey, string][]).map(
        ([key, path]) => [key, `${base}/${path}`],
      ),
    ) as Record<MarketplaceSchemaKey, string>;
  }

  static keys(): readonly MarketplaceSchemaKey[] {
    return Object.keys(MarketplaceSchemasRegistry.Paths) as MarketplaceSchemaKey[];
  }

  private static schemaBaseUrl(): string {
    const env = MarketplaceSchemasRegistry.envOverride ?? process.env;
    const fromEnv = env[SCHEMA_BASE_URL_ENV]?.trim();
    return normalizeBaseUrl(fromEnv || DEFAULT_SCHEMA_BASE_URL);
  }
}

export type MarketplaceSchemaKey = keyof typeof MarketplaceSchemasRegistry["Paths"];

/** Static schema catalog; use `MarketplaceSchemas.Schemas.Plan`, and so on. */
export const MarketplaceSchemas = MarketplaceSchemasRegistry;
