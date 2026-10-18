import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MarketplaceSchemas, MarketplaceSchemasRegistry } from "../src/schemas/marketplace-schemas.js";

describe("MarketplaceSchemas", () => {
  it("builds default product schema URLs", () => {
    assert.equal(
      MarketplaceSchemas.Schemas.Plan,
      "https://schema.mp.microsoft.com/schema/plan/2026-10-01",
    );
  });

  it("uses SCHEMA_BASE_URL from the registry constructor", () => {
    new MarketplaceSchemasRegistry({
      SCHEMA_BASE_URL: "https://schemas.example.test",
    });
    assert.equal(
      MarketplaceSchemas.Schemas.Plan,
      "https://schemas.example.test/schema/plan/2026-10-01",
    );
    new MarketplaceSchemasRegistry({});
    assert.equal(
      MarketplaceSchemas.Schemas.Plan,
      "https://schema.mp.microsoft.com/schema/plan/2026-10-01",
    );
  });

  it("lists schema keys for CLI choices", () => {
    assert.ok(MarketplaceSchemas.keys().includes("Plan"));
    assert.equal(
      MarketplaceSchemas.Schemas.Plan,
      "https://schema.mp.microsoft.com/schema/plan/2026-10-01",
    );
  });
});
