export type {
  BuildUrlInput,
  BuiltRequest,
  Endpoint,
  HttpMethod,
  PathParam,
  QueryParam,
  ServiceId,
} from "./types.js";
export {
  baseUrlFor,
  getService,
  normalizeBaseUrl,
  resolveBaseUrl,
  services,
  UrlBuildError,
  type ServiceDefinition,
} from "./bases.js";
export { assertEndpointShape, buildUrl, placeholderNames } from "./build.js";
export { endpoint, endpointGroups, endpoints, getEndpoint, listEndpoints } from "./catalog.js";
