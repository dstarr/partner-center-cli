import { getService } from "./bases.js";
import { assertEndpointShape } from "./build.js";
import type { Endpoint, HttpMethod } from "./types.js";

/**
 * Operations this CLI knows how to call.
 * Each entry is checked against its path template and service when the module loads.
 * To explore a new operation, add it here instead of building a URL by hand.
 */
export const endpoints: readonly Endpoint[] = [];

const byId = new Map(endpoints.map((item) => [item.id, item]));

export function getEndpoint(id: string): Endpoint {
  const found = byId.get(id);
  if (!found) {
    throw new Error(`Unknown endpoint "${id}". Run "endpoints" to list them.`);
  }
  return found;
}

export function listEndpoints(filter?: { group?: string; method?: HttpMethod }): Endpoint[] {
  return endpoints.filter((item) => {
    if (filter?.group !== undefined && item.group !== filter.group) {
      return false;
    }
    if (filter?.method !== undefined && item.method !== filter.method) {
      return false;
    }
    return true;
  });
}

export function endpointGroups(): string[] {
  return [...new Set(endpoints.map((item) => item.group))];
}

/** Wrap each catalog entry with this so it is validated when the module loads. */
export function endpoint(definition: Endpoint): Endpoint {
  assertEndpointShape(definition);
  getService(definition.service);
  return definition;
}

function assertUniqueIds(items: readonly Endpoint[]): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) {
      throw new Error(`Duplicate endpoint id "${item.id}".`);
    }
    seen.add(item.id);
  }
}

assertUniqueIds(endpoints);
