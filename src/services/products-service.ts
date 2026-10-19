import { AuthManager } from "../auth/auth-manager.js";
import { sendApiRequest, type ApiResponse } from "../http/client.js";
import { ApiError, fetchAllPages } from "../http/pages.js";
import { buildUrl, getEndpoint, type BuildUrlInput } from "../urls/index.js";
import { MarketplaceSchemasRegistry } from "../schemas/marketplace-schemas.js";
import type { ProductConfiguration } from "./product-configuration-factory.js";

/** A product resource from the Product Ingestion API. */
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

export const TARGET_TYPES = ["draft", "preview", "live"] as const;

export type TargetType = (typeof TARGET_TYPES)[number];

/** One resource in a product resource tree, such as a plan, listing, or submission. */
export interface ProductResource {
  $schema: string;
  id?: string;
  [property: string]: unknown;
}

/** A product and every resource under it (plans, listings, pricing, submissions, and so on). */
export interface ProductResourceTree {
  $schema: string;
  /** Durable id of the product, such as `product/27494b66-...`. */
  root: string;
  target: { targetType: TargetType };
  resources: ProductResource[];
  [property: string]: unknown;
}

export interface ProductsServiceOptions {
  /** Defaults to an AuthManager built from .env with the product ingestion resource. */
  auth?: AuthManager;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** Orchestrates calls for products defined in Partner Center. */
export class ProductsService {
  private readonly auth: AuthManager;
  private readonly options: Omit<ProductsServiceOptions, "auth">;

  public constructor(options: ProductsServiceOptions = {}) {
    const { auth, ...rest } = options;
    this.options = rest;
    this.auth = auth ?? this.createDefaultAuth();
  }

  /** Fetches every product the publisher has defined, following all result pages. */
  public async getAllProducts(): Promise<Product[]> {
    const url = this.buildUrl({ endpoint: getEndpoint("products.list") });
    const { items } = await fetchAllPages<Product>({
      url,
      accessToken: await this.auth.getAccessToken(),
      ...this.requestOptions(),
    });
    return items;
  }

  /** Fetches the resource schemas for one product and all of its resources. */
  public async getProductResourceSchemas(
    productId: string,
    options: { targetType?: TargetType } = {},
  ): Promise<string[]> {
    const product = await this.getProduct(productId, options);
    return product.resources.map((resource) => resource.$schema);
  }

  /**
   * Fetches one product and all of its resources.
   * Accepts the durable id with or without the `product/` prefix.
   */
  public async getProduct(
    productId: string,
    options: { targetType?: TargetType } = {},
  ): Promise<ProductResourceTree> {
    const id = this.normalizeProductId(productId);
    const url = this.buildUrl({
      endpoint: getEndpoint("product.get"),
      pathParams: { productId: id },
      ...this.productGetQuery(options.targetType),
    });
    const response = await this.sendGet(url);
    return this.parseProductTree(response);
  }

  /** Posts a product alias change for the product resource in the resource tree. */
  public async renameProduct(productId: string, alias: string): Promise<string> {
    const product = await this.getProduct(productId);
    const productResource = this.findProductResource(product);
    this.assertAliasChange(productResource, alias);
    productResource.alias = alias;
    return this.postProductConfiguration({
      $schema: MarketplaceSchemasRegistry.Schemas.Configure,
      resources: [productResource],
    });
  }

  /** Post a product configuration using the ingestion API. */
  public async postProductConfiguration(configuration: ProductConfiguration): Promise<string> {
    const url = this.buildUrl({
      endpoint: getEndpoint("product.configure"),
    });
    const response = await this.sendPost(url, JSON.stringify(configuration));
    return response.bodyText;
  }

  private findProductResource(product: ProductResourceTree): ProductResource {
    const productResource = product.resources.find(
      (resource) => resource.$schema === MarketplaceSchemasRegistry.Schemas.Product,
    );
    if (productResource === undefined) {
      throw new Error(`Product resource with schema ${MarketplaceSchemasRegistry.Schemas.Product} not found`);
    }
    return productResource;
  }

  private assertAliasChange(productResource: ProductResource, alias: string): void {
    if (productResource.alias === alias) {
      throw new Error(`Product already has alias ${alias}`);
    }
  }

  private normalizeProductId(productId: string): string {
    const id = productId.trim().replace(/^product\//, "");
    if (id.length === 0) {
      throw new Error("Product id is required.");
    }
    return id;
  }

  private productGetQuery(targetType: TargetType | undefined): { query: { targetType: TargetType } } | Record<string, never> {
    if (targetType === undefined) {
      return {};
    }
    if (!TARGET_TYPES.includes(targetType)) {
      throw new Error(`targetType must be one of ${TARGET_TYPES.join(", ")}.`);
    }
    return { query: { targetType } };
  }

  private parseProductTree(response: ApiResponse): ProductResourceTree {
    if (!response.ok) {
      throw new ApiError(response);
    }
    return JSON.parse(response.bodyText) as ProductResourceTree;
  }

  private createDefaultAuth(): AuthManager {
    const { resource } = getEndpoint("products.list").service;
    return AuthManager.fromEnv(process.env, resource ? { resource } : {});
  }

  private buildUrl(input: BuildUrlInput): URL {
    return buildUrl(input).url;
  }

  private async sendGet(url: URL): Promise<ApiResponse> {
    return sendApiRequest({
      url,
      method: "GET",
      accessToken: await this.auth.getAccessToken(),
      ...this.requestOptions(),
    });
  }

  private async sendPost(url: URL, body: string): Promise<ApiResponse> {
    const response = await sendApiRequest({
      url,
      method: "POST",
      accessToken: await this.auth.getAccessToken(),
      body,
      ...this.requestOptions(),
    });
    if (!response.ok) {
      throw new ApiError(response);
    }
    return response;
  }

  private requestOptions(): { timeoutMs?: number; fetchImpl?: typeof fetch } {
    return {
      ...(this.options.timeoutMs !== undefined ? { timeoutMs: this.options.timeoutMs } : {}),
      ...(this.options.fetchImpl !== undefined ? { fetchImpl: this.options.fetchImpl } : {}),
    };
  }
}
