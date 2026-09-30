import { ProductSchemas } from "./products-parser.js";
import type { ProductResource } from "./products-service.js";

/** A product resource to send to the Product Ingestion configure API. */
export interface ProductConfiguration {
  $schema: string;
  /** Durable id, such as `product/27494b66-...`. */
  resources: ProductResource[];
}

export class ProductConfigurationFactory {
  public static create(productId: string, alias: string): ProductConfiguration {
    return {
        $schema: ProductSchemas.Configure,
        resources: [{
            $schema: ProductSchemas.Product,
            id: 'product/' + productId,
            alias: alias,
          },
        ],
    };
  }
}
