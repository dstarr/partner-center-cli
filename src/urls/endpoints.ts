import { baseUrlFor, services } from "./bases.js";
import { assertEndpointShape } from "./build.js";
import type { Endpoint, HttpMethod } from "./types.js";

/**
 * Operations this CLI knows how to call.
 * Each entry is checked against its path template and service when the module loads.
 * To explore a new operation, add it here instead of building a URL by hand.
 */
export const endpoints: readonly Endpoint[] = [
  /**
   * List all products defined by the publisher.
   */
  endpoint({
    id: "products.list",
    group: "products",
    method: "GET",
    summary: "List all products defined by the publisher.",
    path: "/product",
    service: services.productIngestion,
    paged: true,
    pathParams: [],
    queryParams: [
      {
        name: "$version",
        description: "Schema version of the response. The latest version at or below this is returned.",
        required: true,
        default: "2022-03-01-preview3",
      },
      {
        name: "type",
        description: "Product type filter, for example softwareAsAService, azureContainer, or azureVirtualMachine.",
        required: false,
      },
      {
        name: "externalID",
        description: "Return the product with this external ID.",
        required: false,
      },
      {
        name: "$maxpagesize",
        description: "Maximum number of products per page.",
        required: false,
      },
      {
        name: "continuationToken",
        description: "Token from the previous page's response, used to get the next page.",
        required: false,
      },
    ],
    docsUrl:
      "https://learn.microsoft.com/en-us/partner-center/marketplace-offers/product-ingestion-api#method-3-query-string-parameters",
  }),
  
  
  /**
   * Get a product and all of its resources (plans, listings, pricing, and so on) as a resource tree.
   */
  endpoint({
    id: "product.get",
    group: "product",
    method: "GET",
    summary: "Get a product and all of its resources (plans, listings, pricing, and so on) as a resource tree.",
    path: "/resource-tree/product/{productId}",
    service: services.productIngestion,
    pathParams: [
      {
        name: "productId",
        description: "Product durable id without the product/ prefix, for example 27494b66-e9d3-4b2d-848b-5ce0543abd90.",
      },
    ],
    queryParams: [
      {
        name: "targetType",
        description: "Environment to read: draft, preview, or live. Omit for draft. Send without quotes.",
        required: false,
      },
      {
        name: "$version",
        description: "Maximum schema version for each resource in the tree.",
        required: true,
        default: "2022-03-01-preview5",
      },
    ],
    docsUrl:
      "https://learn.microsoft.com/en-us/partner-center/marketplace-offers/product-ingestion-api#method-1-resource-tree",
  }),

  /**
   * post changes to a product using the ingestion API
   */
  endpoint({
    id: "product.configure",
    group: "product",
    method: "POST",
    summary: "Post a product configuration using the ingestion API.",
    path: "/configure",
    service: services.productIngestion,
    pathParams: [],
    queryParams: [
      {
        name: "$version",
        description: "Schema version of the response.",
        required: true,
        default: "2022-03-01-preview2",
      },
    ],
  }),

  /**
   * List all private offers, including multiparty private offers.
   */
  endpoint({
    id: "privateOffers.list",
    group: "privateOffers",
    method: "GET",
    summary: "List all private offers, including multiparty private offers, associated with the account.",
    path: "/private-offer/query",
    service: services.productIngestion,
    paged: true,
    pageItemsKey: "privateOffers",
    pathParams: [],
    queryParams: [
      {
        name: "$version",
        description: "Schema version of the response.",
        required: true,
        default: "2023-07-15",
      },
    ],
    docsUrl:
      "https://learn.microsoft.com/en-us/partner-center/marketplace-offers/private-offers-api#retrieve-private-offers",
  }),
];

const byId = new Map(endpoints.map((item) => [item.id, item]));

export function getEndpoint(id: string): Endpoint {
  const found = byId.get(id);
  if (!found) {
    throw new Error(`Unknown endpoint "${id}". Run "endpoints" to list them.`);
  }
  return found;
}

export function listEndpoints(filter?: { group?: string; method?: HttpMethod }): Endpoint[] {
  return endpoints.filter((item) => {
    if (filter?.group !== undefined && item.group !== filter.group) {
      return false;
    }
    if (filter?.method !== undefined && item.method !== filter.method) {
      return false;
    }
    return true;
  });
}

export function endpointGroups(): string[] {
  return [...new Set(endpoints.map((item) => item.group))];
}

/** Wrap each catalog entry with this so it is validated when the module loads. */
export function endpoint(definition: Endpoint): Endpoint {
  assertEndpointShape(definition);
  baseUrlFor(definition.service);
  return definition;
}

function assertUniqueIds(items: readonly Endpoint[]): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) {
      throw new Error(`Duplicate endpoint id "${item.id}".`);
    }
    seen.add(item.id);
  }
}

assertUniqueIds(endpoints);
