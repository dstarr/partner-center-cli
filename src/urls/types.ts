import type { ServiceDefinition } from "./bases.js";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/** A value substituted into a `{placeholder}` in an endpoint path. */
export interface PathParam {
  name: string;
  description: string;
}

/** A query string field declared for an endpoint. */
export interface QueryParam {
  name: string;
  description: string;
  required: boolean;
  /** Sent when the caller does not pass a value. */
  default?: string;
}

/**
 * One API operation.
 * Paths are templates relative to the service base URL. Add new operations
 * in the catalog instead of assembling URLs at the call site.
 */
export interface Endpoint {
  /** Stable id used by the CLI, such as `items.list`. */
  id: string;
  /** Browse group. The id must start with `{group}.`. */
  group: string;
  method: HttpMethod;
  summary: string;
  /** Absolute path such as `/v1/items/{itemId}`. Placeholders are `{camelCase}`. */
  path: string;
  /** An entry from `services` in bases.ts. */
  service: ServiceDefinition;
  pathParams: readonly PathParam[];
  queryParams: readonly QueryParam[];
  /** Responses are `{ value, @nextLink }` pages; `call` follows every page. */
  paged?: boolean;
  /** Property holding each page's items when it is not `value`, such as `privateOffers`. */
  pageItemsKey?: string;
  docsUrl?: string;
}

export interface BuildUrlInput {
  endpoint: Endpoint;
  /** Replaces the service base URL for this call. Must be an https URL without a query or hash. */
  baseUrl?: string;
  pathParams?: Readonly<Record<string, string | number>>;
  query?: Readonly<Record<string, string | number | boolean | undefined | null>>;
  /**
   * When true, query keys must be declared on the endpoint.
   * Set false to pass extra query parameters while exploring.
   */
  strictQuery?: boolean;
}

export interface BuiltRequest {
  endpoint: Endpoint;
  method: HttpMethod;
  url: URL;
  baseUrl: string;
}
