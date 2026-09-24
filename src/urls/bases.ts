export interface ServiceDefinition {
  description: string;
  /** https URL, optionally with a path, used when `baseUrlEnv` is unset or blank. */
  defaultBaseUrl: string;
  /** Environment variable that overrides `defaultBaseUrl`. */
  baseUrlEnv?: string;
  /** Resource (token audience) the AuthManager requests. Defaults to the AuthManager's DEFAULT_RESOURCE. */
  resource?: string;
}

/** APIs the catalog can call. Endpoints reference these objects directly. */
export const services = {
  productIngestion: {
    description: "Microsoft Marketplace Product Ingestion API (Microsoft Graph)",
    baseUrlEnv: "PRODUCT_INGESTION_BASE_URL",
    defaultBaseUrl: "https://graph.microsoft.com/rp/product-ingestion",
    resource: "https://graph.microsoft.com",
  },
  productIngestionResourceTree: {
    description: "Microsoft Marketplace Product Ingestion API (Microsoft Graph)",
    baseUrlEnv: "PRODUCT_INGESTION_RESOURCE_TREE_BASE_URL",
    defaultBaseUrl: "https://graph.microsoft.com/rp/product-ingestion/resource-tree",
    resource: "https://graph.microsoft.com",
  },
} as const satisfies Record<string, ServiceDefinition>;

export type ServiceId = keyof typeof services;

export class UrlBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UrlBuildError";
  }
}

/** Read at call time because .env is loaded after this module is imported. */
export function baseUrlFor(service: ServiceDefinition, env: NodeJS.ProcessEnv = process.env): string {
  const fromEnv = service.baseUrlEnv ? env[service.baseUrlEnv]?.trim() : undefined;
  return normalizeBaseUrl(fromEnv || service.defaultBaseUrl);
}

export function normalizeBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new UrlBuildError(`Base URL is not a valid absolute URL: ${value}`);
  }
  if (url.protocol !== "https:") {
    throw new UrlBuildError("Base URL must use https.");
  }
  if (url.username || url.password) {
    throw new UrlBuildError("Base URL must not include credentials.");
  }
  if (url.search || url.hash) {
    throw new UrlBuildError("Base URL must not include a query or hash.");
  }
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

export function resolveBaseUrl(input: { 
  service: ServiceDefinition; 
  baseUrl?: string 
}): string {
  if (input.baseUrl !== undefined) {
    return normalizeBaseUrl(input.baseUrl);
  }
  return baseUrlFor(input.service);
}
