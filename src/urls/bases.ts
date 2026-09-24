import type { CloudId, ServiceId } from "./types.js";

/**
 * Published Partner Center base URLs.
 * https://learn.microsoft.com/en-us/partner-center/developer/partner-center-rest-urls
 *
 * `partnerCenter` is the main REST API. `partner` is pricing and referrals,
 * which Microsoft publishes only for the global cloud.
 */
export const services = {
  partnerCenter: {
    description: "Customers, catalog, orders, subscriptions, invoices, and profiles",
    bases: {
      global: "https://api.partnercenter.microsoft.com",
      china: "https://partner.partnercenterapi.microsoftonline.cn",
    },
  },
  partner: {
    description: "Pricing and referrals",
    bases: {
      global: "https://api.partner.microsoft.com",
    },
  },
} as const satisfies Record<
  ServiceId,
  { description: string; bases: Partial<Record<CloudId, string>> }
>;

export class UrlBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UrlBuildError";
  }
}

export function isCloudId(value: string): value is CloudId {
  return value === "global" || value === "china";
}

export function assertCloud(value: string): CloudId {
  if (isCloudId(value)) {
    return value;
  }
  throw new UrlBuildError(`Unknown cloud "${value}". Use global or china.`);
}

export function baseUrlFor(service: ServiceId, cloud: CloudId): string {
  const bases: Partial<Record<CloudId, string>> = services[service].bases;
  const base = bases[cloud];
  if (!base) {
    throw new UrlBuildError(`${service} does not publish a ${cloud} base URL.`);
  }
  return base;
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

export function resolveBaseUrl(input: {
  service: ServiceId;
  cloud: CloudId;
  baseUrl?: string;
}): string {
  if (input.baseUrl !== undefined) {
    return normalizeBaseUrl(input.baseUrl);
  }
  return baseUrlFor(input.service, input.cloud);
}
