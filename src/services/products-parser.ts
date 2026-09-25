import type { ProductResource, ProductResourceTree } from "./products-service.js";

/** Picks resources out of a product resource tree by the `$schema` they use. */
export class ProductParser {
  /** Returns every resource in the product whose `$schema` equals `schema`, in tree order. */
  getResources(product: ProductResourceTree, schema: ProductSchemas): ProductResource[] {
    return product.resources.filter((resource) => resource.$schema === schema);
  }

  /**
   * Returns the durable ids of the product's resources, in tree order.
   * Pass `schema` to only include resources that use it. Resources without an id are skipped.
   */
  getResourceIds(product: ProductResourceTree, schema?: ProductSchemas): string[] {
    const resources = schema === undefined ? product.resources : this.getResources(product, schema);
    return resources.flatMap((resource) => (typeof resource.id === "string" ? [resource.id] : []));
  }
}

/** `$schema` URLs of the resources in a product resource tree. */
export enum ProductSchemas {
    CommercialMarketplaceSetup = "https://schema.mp.microsoft.com/schema/commercial-marketplace-setup/2022-03-01-preview2",
    CustomerLeads = "https://schema.mp.microsoft.com/schema/customer-leads/2022-03-01-preview3",
    Listing = "https://schema.mp.microsoft.com/schema/listing/2022-03-01-preview3",
    ListingAsset = "https://schema.mp.microsoft.com/schema/listing-asset/2022-03-01-preview3",
    Microsoft365Integration = "https://schema.mp.microsoft.com/schema/microsoft365-integration/2022-03-01-preview2",
    Plan = "https://schema.mp.microsoft.com/schema/plan/2022-03-01-preview3",
    PlanListing = "https://schema.mp.microsoft.com/schema/plan-listing/2022-03-01-preview3",
    PriceAndAvailabilityCustomMeter = "https://schema.mp.microsoft.com/schema/price-and-availability-custom-meter/2022-03-01-preview3",
    PriceAndAvailabilityOffer = "https://schema.mp.microsoft.com/schema/price-and-availability-offer/2022-03-01-preview3",
    PriceAndAvailabilityPlan = "https://schema.mp.microsoft.com/schema/price-and-availability-plan/2022-03-01-preview4",
    Product = "https://schema.mp.microsoft.com/schema/product/2022-03-01-preview3",
    Property = "https://schema.mp.microsoft.com/schema/property/2022-03-01-preview3",
    Reseller = "https://schema.mp.microsoft.com/schema/reseller/2022-03-01-preview2",
    SoftwareAsAServiceTechnicalConfiguration = "https://schema.mp.microsoft.com/schema/software-as-a-service-technical-configuration/2022-03-01-preview3",
    Submission = "https://schema.mp.microsoft.com/schema/submission/2022-03-01-preview2",
  }
