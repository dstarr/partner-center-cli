import type { ServiceId } from "./types.js";

export interface ServiceDefinition {
  description: string;
  /** https origin used when `baseUrlEnv` is unset or blank. */
  defaultBaseUrl: string;
  /** Environment variable that overrides `defaultBaseUrl`. */
  baseUrlEnv?: string;
  /** Resource (token audience) the AuthManager requests. Defaults to the AuthManager's DEFAULT_RESOURCE. */
  resource?: string;
}

/** APIs the catalog can call. Endpoints reference these by key. */
export const services: Readonly<Record<ServiceId, ServiceDefinition>> = {};

export class UrlBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UrlBuildError";
  }
}

export function getService(service: ServiceId): ServiceDefinition {
  const definition = services[service];
  if (!definition) {
    const known = Object.keys(services);
    throw new UrlBuildError(
      `Unknown service "${service}". Known services: ${known.length > 0 ? known.join(", ") : "none"}.`,
    );
  }
  return definition;
}

/** Read at call time because .env is loaded after this module is imported. */
export function baseUrlFor(service: ServiceId, env: NodeJS.ProcessEnv = process.env): string {
  const definition = getService(service);
  const fromEnv = definition.baseUrlEnv ? env[definition.baseUrlEnv]?.trim() : undefined;
  return normalizeBaseUrl(fromEnv || definition.defaultBaseUrl);
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
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new UrlBuildError("Base URL must be an origin, without a path, query, or hash.");
  }
  return url.origin;
}

export function resolveBaseUrl(input: { service: ServiceId; baseUrl?: string }): string {
  if (input.baseUrl !== undefined) {
    return normalizeBaseUrl(input.baseUrl);
  }
  return baseUrlFor(input.service);
}
