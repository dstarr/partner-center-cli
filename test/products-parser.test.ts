import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ProductParser, ProductSchemas } from "../src/services/products-parser.js";
import type { ProductResourceTree } from "../src/services/products-service.js";

const product: ProductResourceTree = {
  $schema: "https://schema.mp.microsoft.com/schema/resource-tree/2022-03-01-preview2",
  root: "product/abc",
  target: { targetType: "draft" },
  resources: [
    { $schema: ProductSchemas.Product, id: "product/abc" },
    { $schema: ProductSchemas.Plan, id: "plan/abc/1" },
    { $schema: ProductSchemas.Listing, id: "listing/abc/main" },
    { $schema: ProductSchemas.Plan, id: "plan/abc/2" },
    { $schema: "https://schema.mp.microsoft.com/schema/plan/2099-01-01", id: "plan/abc/3" },
  ],
};

describe("ProductParser.getResources", () => {
  const parser = new ProductParser();

  it("returns every resource with a matching $schema, in tree order", () => {
    assert.deepEqual(
      parser.getResources(product, ProductSchemas.Plan).map((resource) => resource.id),
      ["plan/abc/1", "plan/abc/2"],
    );
  });

  it("returns every resource when no schema is given", () => {
    assert.equal(parser.getResources(product).length, product.resources.length);
  });

  it("returns an empty array when nothing matches", () => {
    assert.deepEqual(parser.getResources(product, ProductSchemas.Submission), []);
  });
});

describe("ProductParser.getResourceIds", () => {
  const parser = new ProductParser();

  it("returns every resource id when no schema is given", () => {
    assert.deepEqual(parser.getResourceIds(product), [
      "product/abc",
      "plan/abc/1",
      "listing/abc/main",
      "plan/abc/2",
      "plan/abc/3",
    ]);
  });

  it("returns only the ids of resources that use the schema", () => {
    assert.deepEqual(parser.getResourceIds(product, ProductSchemas.Plan), ["plan/abc/1", "plan/abc/2"]);
  });

  it("skips resources without an id", () => {
    const withoutIds: ProductResourceTree = { ...product, resources: [{ $schema: ProductSchemas.Plan }] };
    assert.deepEqual(parser.getResourceIds(withoutIds), []);
  });
});
