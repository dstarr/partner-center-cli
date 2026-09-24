import { AuthManager } from "../auth/manager.js";
import { sendApiRequest } from "../http/client.js";
import { ApiError, fetchAllPages } from "../http/pages.js";
import { buildUrl, getEndpoint, getService, type BuildUrlInput } from "../urls/index.js";

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

export type TargetType = "draft" | "preview" | "live";

export const TARGET_TYPES: readonly TargetType[] = ["draft", "preview", "live"];

/** A product and every resource under it (plans, listings, pricing, submissions, and so on). */
export interface ProductResourceTree {
  $schema: string;
  /** Durable id of the product, such as `product/27494b66-...`. */
  root: string;
  target: { targetType: TargetType };
  resources: Array<{ $schema: string; id?: string; [property: string]: unknown }>;
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
    const url = this.url({ endpoint: getEndpoint("products.list") });
    const { items } = await fetchAllPages<Product>({
      url,
      accessToken: await this.auth.getAccessToken(),
      ...this.requestOptions(),
    });
    return items;
  }

  /**
   * Fetches one product and all of its resources.
   * Accepts the durable id with or without the `product/` prefix. Reads the draft unless `targetType` is set.
   */
  async getProduct(
    productId: string,
    options: { targetType?: TargetType } = {},
  ): Promise<ProductResourceTree> {
    const id = productId.trim().replace(/^product\//, "");
    if (id.length === 0) {
      throw new Error("Product id is required.");
    }
    if (options.targetType !== undefined && !TARGET_TYPES.includes(options.targetType)) {
      throw new Error(`targetType must be one of ${TARGET_TYPES.join(", ")}.`);
    }

    const url = this.url({
      endpoint: getEndpoint("products.get"),
      pathParams: { productId: id },
      query: { targetType: options.targetType },
    });
    const response = await sendApiRequest({
      url,
      method: "GET",
      accessToken: await this.auth.getAccessToken(),
      ...this.requestOptions(),
    });
    if (!response.ok) {
      throw new ApiError(response);
    }
    return JSON.parse(response.bodyText) as ProductResourceTree;
  }

  private url(input: Omit<BuildUrlInput, "baseUrl">): URL {
    return buildUrl({
      ...input,
      ...(this.options.baseUrl !== undefined ? { baseUrl: this.options.baseUrl } : {}),
    }).url;
  }

  private requestOptions(): { locale?: string; timeoutMs?: number; fetchImpl?: typeof fetch } {
    return {
      ...(this.options.locale !== undefined ? { locale: this.options.locale } : {}),
      ...(this.options.timeoutMs !== undefined ? { timeoutMs: this.options.timeoutMs } : {}),
      ...(this.options.fetchImpl !== undefined ? { fetchImpl: this.options.fetchImpl } : {}),
    };
  }
}
