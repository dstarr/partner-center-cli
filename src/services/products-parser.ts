import type { ProductResource, ProductResourceTree } from "./products-service.js";

/** Picks resources out of a product resource tree by the `$schema` they use. */
export class ProductParser {
  /**
   * Returns the product's resources in tree order.
   * Pass `schema` to only include resources whose `$schema` equals it.
   */
  public getResources(product: ProductResourceTree, schema?: string): ProductResource[] {
    if (schema === undefined) {
      return [...product.resources];
    }
    return product.resources.filter((resource) => resource.$schema === schema);
  }

  /**
   * Returns the durable ids of the product's resources, in tree order.
   * Pass `schema` to only include resources that use it. Resources without an id are skipped.
   */
  public getResourceIds(product: ProductResourceTree, schema?: string): string[] {
    return this.getResources(product, schema).flatMap((resource) =>
      typeof resource.id === "string" ? [resource.id] : [],
    );
  }
}
