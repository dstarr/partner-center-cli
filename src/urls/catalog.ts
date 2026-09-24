import { assertEndpointShape } from "./build.js";
import type { Endpoint, HttpMethod } from "./types.js";

const DOCS = "https://learn.microsoft.com/en-us/partner-center/developer";

const customerId = {
  name: "customerId",
  description: "GUID of the customer tenant (customer-tenant-id).",
};

const country = {
  name: "country",
  description: "ISO country/region code, for example US.",
  required: true,
};

/**
 * Operations this CLI knows how to call.
 * Each entry is checked against its path template when the module loads.
 * To explore a new operation, add it here instead of building a URL by hand.
 */
export const endpoints: readonly Endpoint[] = [
  endpoint({
    id: "profiles.organization.get",
    group: "profiles",
    method: "GET",
    summary: "Get the partner organization profile.",
    path: "/v1/profiles/organization",
    service: "partnerCenter",
    pathParams: [],
    queryParams: [],
    docsUrl: `${DOCS}/get-an-organization-profile`,
  }),
  endpoint({
    id: "customers.list",
    group: "customers",
    method: "GET",
    summary: "List customers for the authenticated partner.",
    path: "/v1/customers",
    service: "partnerCenter",
    pathParams: [],
    queryParams: [
      {
        name: "size",
        description: "Number of customers to return.",
        required: true,
      },
    ],
    docsUrl: `${DOCS}/get-a-list-of-customers`,
  }),
  endpoint({
    id: "customers.get",
    group: "customers",
    method: "GET",
    summary: "Get one customer by tenant id.",
    path: "/v1/customers/{customerId}",
    service: "partnerCenter",
    pathParams: [customerId],
    queryParams: [],
    docsUrl: `${DOCS}/get-a-customer-by-id`,
  }),
  endpoint({
    id: "subscriptions.list",
    group: "subscriptions",
    method: "GET",
    summary: "List a customer's subscriptions.",
    path: "/v1/customers/{customerId}/subscriptions",
    service: "partnerCenter",
    pathParams: [customerId],
    queryParams: [],
    docsUrl: `${DOCS}/get-all-of-a-customer-s-subscriptions`,
  }),
  endpoint({
    id: "subscriptions.get",
    group: "subscriptions",
    method: "GET",
    summary: "Get one customer subscription.",
    path: "/v1/customers/{customerId}/subscriptions/{subscriptionId}",
    service: "partnerCenter",
    pathParams: [
      customerId,
      {
        name: "subscriptionId",
        description: "GUID of the subscription.",
      },
    ],
    queryParams: [],
    docsUrl: `${DOCS}/get-a-subscription-by-id`,
  }),
  endpoint({
    id: "orders.list",
    group: "orders",
    method: "GET",
    summary: "List a customer's orders. New orders can take up to 15 minutes to appear.",
    path: "/v1/customers/{customerId}/orders",
    service: "partnerCenter",
    pathParams: [customerId],
    queryParams: [],
    docsUrl: `${DOCS}/get-all-of-a-customer-s-orders`,
  }),
  endpoint({
    id: "orders.get",
    group: "orders",
    method: "GET",
    summary: "Get one customer order.",
    path: "/v1/customers/{customerId}/orders/{orderId}",
    service: "partnerCenter",
    pathParams: [
      customerId,
      {
        name: "orderId",
        description: "Order identifier.",
      },
    ],
    queryParams: [],
  }),
  endpoint({
    id: "orders.provisioningStatus.get",
    group: "orders",
    method: "GET",
    summary: "Get provisioning status for an order.",
    path: "/v1/customers/{customerId}/orders/{orderId}/provisioningstatus",
    service: "partnerCenter",
    pathParams: [
      customerId,
      {
        name: "orderId",
        description: "Order identifier.",
      },
    ],
    queryParams: [],
  }),
  endpoint({
    id: "products.list",
    group: "products",
    method: "GET",
    summary: "List catalog products for a country/region and target view.",
    path: "/v1/products",
    service: "partnerCenter",
    pathParams: [],
    queryParams: [
      country,
      {
        name: "targetView",
        description:
          "Catalog view. Common values: Azure, MicrosoftAzure, OnlineServices, Software, SoftwareSubscriptions, MarketplaceSaaS, AzureReservations, AzureReservationsVM.",
        required: true,
      },
      {
        name: "targetSegment",
        description: "Audience filter: commercial, education, government, or nonprofit.",
        required: false,
      },
      {
        name: "reservationScope",
        description: "Set to AzurePlan to list Azure reservation items that apply to Azure plans.",
        required: false,
      },
    ],
    docsUrl: `${DOCS}/get-a-list-of-products`,
  }),
  endpoint({
    id: "products.get",
    group: "products",
    method: "GET",
    summary: "Get one catalog product.",
    path: "/v1/products/{productId}",
    service: "partnerCenter",
    pathParams: [
      {
        name: "productId",
        description: "Product identifier.",
      },
    ],
    queryParams: [country],
  }),
  endpoint({
    id: "products.skus.list",
    group: "products",
    method: "GET",
    summary: "List SKUs for a product in a country/region.",
    path: "/v1/products/{productId}/skus",
    service: "partnerCenter",
    pathParams: [
      {
        name: "productId",
        description: "Product identifier.",
      },
    ],
    queryParams: [
      country,
      {
        name: "targetSegment",
        description: "Audience filter: commercial, education, government, or nonprofit.",
        required: false,
      },
      {
        name: "reservationScope",
        description: "Set to AzurePlan to list SKUs that apply to Azure plans.",
        required: false,
      },
    ],
    docsUrl: `${DOCS}/get-a-list-of-skus-for-a-product`,
  }),
  endpoint({
    id: "products.skus.get",
    group: "products",
    method: "GET",
    summary: "Get one SKU for a product.",
    path: "/v1/products/{productId}/skus/{skuId}",
    service: "partnerCenter",
    pathParams: [
      {
        name: "productId",
        description: "Product identifier.",
      },
      {
        name: "skuId",
        description: "SKU identifier.",
      },
    ],
    queryParams: [country],
  }),
  endpoint({
    id: "products.availabilities.list",
    group: "products",
    method: "GET",
    summary: "List availabilities for a product SKU.",
    path: "/v1/products/{productId}/skus/{skuId}/availabilities",
    service: "partnerCenter",
    pathParams: [
      {
        name: "productId",
        description: "Product identifier.",
      },
      {
        name: "skuId",
        description: "SKU identifier.",
      },
    ],
    queryParams: [country],
  }),
  endpoint({
    id: "invoices.list",
    group: "invoices",
    method: "GET",
    summary:
      "List partner invoices. For modern commerce, size and offset apply to legacy invoices only.",
    path: "/v1/invoices",
    service: "partnerCenter",
    pathParams: [],
    queryParams: [
      {
        name: "size",
        description: "Page size. Ignored for modern commerce invoices.",
        required: false,
      },
      {
        name: "offset",
        description: "Zero-based index of the first invoice. Ignored for modern commerce invoices.",
        required: false,
      },
      {
        name: "filter",
        description:
          'Filter expression, for example {"Field":"InvoiceDate","Value":"01/01/2023","Operator":"greater_than_or_equals"}.',
        required: false,
      },
    ],
    docsUrl: `${DOCS}/get-a-collection-of-invoices`,
  }),
  endpoint({
    id: "invoices.get",
    group: "invoices",
    method: "GET",
    summary: "Get one invoice. The id may include a type prefix such as Recurring- or OneTime-.",
    path: "/v1/invoices/{invoiceId}",
    service: "partnerCenter",
    pathParams: [
      {
        name: "invoiceId",
        description: "Invoice identifier, including any type prefix returned by invoices.list.",
      },
    ],
    queryParams: [],
  }),
];

const byId = new Map(endpoints.map((item) => [item.id, item]));

export function getEndpoint(id: string): Endpoint {
  const found = byId.get(id);
  if (!found) {
    throw new Error(`Unknown endpoint "${id}". Run "partner-center endpoints" to list them.`);
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

function endpoint(definition: Endpoint): Endpoint {
  assertEndpointShape(definition);
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
