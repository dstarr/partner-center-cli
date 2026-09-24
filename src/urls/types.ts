export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type CloudId = "global" | "china";

export type ServiceId = "partnerCenter" | "partner";

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
}

/**
 * One Partner Center operation.
 * Paths are templates relative to the service base URL. Add new operations
 * in the catalog instead of assembling URLs at the call site.
 */
export interface Endpoint {
  /** Stable id used by the CLI, such as `customers.list`. */
  id: string;
  /** Browse group. The id must start with `{group}.`. */
  group: string;
  method: HttpMethod;
  summary: string;
  /** Absolute path beginning with `/v1`. Placeholders are `{camelCase}`. */
  path: string;
  service: ServiceId;
  pathParams: readonly PathParam[];
  queryParams: readonly QueryParam[];
  docsUrl?: string;
}

export interface BuildUrlInput {
  endpoint: Endpoint;
  cloud?: CloudId;
  /** Replaces the published base URL for this call. Must be an https origin. */
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
