import { getService } from "./bases.js";
import { assertEndpointShape } from "./build.js";
import type { Endpoint, HttpMethod } from "./types.js";

/**
 * Operations this CLI knows how to call.
 * Each entry is checked against its path template and service when the module loads.
 * To explore a new operation, add it here instead of building a URL by hand.
 */
export const endpoints: readonly Endpoint[] = [
  endpoint({
    id: "products.list",
    group: "products",
    method: "GET",
    summary: "List all offers (products) defined by the publisher.",
    path: "/product",
    service: "productIngestion",
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
        description: "Return the product with this external ID (offer ID).",
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
  getService(definition.service);
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
