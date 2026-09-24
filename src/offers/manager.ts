import { AuthManager } from "../auth/manager.js";
import { fetchAllPages } from "../http/pages.js";
import { buildUrl, getEndpoint, getService } from "../urls/index.js";

/** A product (offer) resource from the Product Ingestion API. */
export interface Product {
  $schema: string;
  /** Durable id, such as `product/27494b66-...`. */
  id: string;
  identity?: { externalId?: string };
  /** Product type, such as `softwareAsAService`. */
  type: string;
  alias: string;
  [property: string]: unknown;
}

export interface OffersManagerOptions {
  /** Defaults to an AuthManager built from .env with the product ingestion resource. */
  auth?: AuthManager;
  /** Replaces the service base URL, including its path. */
  baseUrl?: string;
  locale?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** Orchestrates calls for products (offers) defined in Partner Center. */
export class OffersManager {
  private readonly auth: AuthManager;
  private readonly options: Omit<OffersManagerOptions, "auth">;

  constructor(options: OffersManagerOptions = {}) {
    const { auth, ...rest } = options;
    this.options = rest;
    if (auth) {
      this.auth = auth;
    } else {
      const { resource } = getService(getEndpoint("products.list").service);
      this.auth = AuthManager.fromEnv(process.env, resource ? { resource } : {});
    }
  }

  /** Fetches every product the publisher has defined, following all result pages. */
  async getAllProducts(): Promise<Product[]> {
    const { url } = buildUrl({
      endpoint: getEndpoint("products.list"),
      ...(this.options.baseUrl !== undefined ? { baseUrl: this.options.baseUrl } : {}),
    });
    const { items } = await fetchAllPages<Product>({
      url,
      accessToken: await this.auth.getAccessToken(),
      ...(this.options.locale !== undefined ? { locale: this.options.locale } : {}),
      ...(this.options.timeoutMs !== undefined ? { timeoutMs: this.options.timeoutMs } : {}),
      ...(this.options.fetchImpl !== undefined ? { fetchImpl: this.options.fetchImpl } : {}),
    });
    return items;
  }
}
