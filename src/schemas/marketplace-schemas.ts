const DEFAULT_SCHEMA_BASE_URL = "https://schema.mp.microsoft.com/schema";

function resolveSchemaBaseUrl(fromEnv: string | undefined): string {
  const raw = fromEnv?.trim() || DEFAULT_SCHEMA_BASE_URL;
  return normalizeSchemaBase(raw);
}

function normalizeSchemaBase(base: string): string {
  const trimmed = base.replace(/\/$/, "");
  if (trimmed.endsWith("/schema")) {
    return trimmed;
  }
  return `${trimmed}/schema`;
}

function buildSchemas(baseUrl: string) {
  return {
    CommercialMarketplaceSetup: `${baseUrl}/commercial-marketplace-setup/2026-10-01`,
    Configure: `${baseUrl}/configure/2026-10-01`,
    CustomerLeads: `${baseUrl}/customer-leads/2026-10-01`,
    Listing: `${baseUrl}/listing/2026-10-01`,
    ListingAsset: `${baseUrl}/listing-asset/2026-10-01`,
    Microsoft365Integration: `${baseUrl}/microsoft365-integration/2026-10-01`,
    Plan: `${baseUrl}/plan/2026-10-01`,
    PlanListing: `${baseUrl}/plan-listing/2026-10-01`,
    PriceAndAvailabilityCustomMeter: `${baseUrl}/price-and-availability-custom-meter/2026-10-01-preview2`,
    PriceAndAvailabilityOffer: `${baseUrl}/price-and-availability-offer/2026-10-01-preview2`,
    PriceAndAvailabilityPlan: `${baseUrl}/price-and-availability-plan/2026-10-01-preview2`,
    Product: `${baseUrl}/product/2026-10-01`,
    Property: `${baseUrl}/property/2026-10-01`,
    Reseller: `${baseUrl}/reseller/2026-10-01-preview2`,
    SoftwareAsAServiceTechnicalConfiguration: `${baseUrl}/software-as-a-service-technical-configuration/2026-10-01`,
    Submission: `${baseUrl}/submission/2022-03-01-preview2`,
  } as const;
}

let activeSchemaBaseUrl = resolveSchemaBaseUrl(process.env["SCHEMA_BASE_URL"]);

/** Builds `$schema` URLs from `SCHEMA_BASE_URL` (or the Microsoft default). */
export class MarketplaceSchemasRegistry {
  /** Overrides the active schema base URL for tests or tooling. */
  public constructor(env: Record<string, string | undefined> = process.env as NodeJS.ProcessEnv) {
    if (Object.keys(env).length === 0) {
      activeSchemaBaseUrl = DEFAULT_SCHEMA_BASE_URL;
      return;
    }
    if ("SCHEMA_BASE_URL" in env) {
      activeSchemaBaseUrl = resolveSchemaBaseUrl(env["SCHEMA_BASE_URL"]);
    }
  }

  public static get Schemas(): ReturnType<typeof buildSchemas> {
    return buildSchemas(activeSchemaBaseUrl);
  }
}

export type MarketplaceSchema = keyof ReturnType<typeof buildSchemas>;

/** Facade used by factories and tests for schema URLs and CLI choice keys. */
export class MarketplaceSchemas {
  public static get Schemas(): ReturnType<typeof buildSchemas> {
    return MarketplaceSchemasRegistry.Schemas;
  }

  public static keys(): MarketplaceSchema[] {
    return Object.keys(MarketplaceSchemasRegistry.Schemas) as MarketplaceSchema[];
  }
}
