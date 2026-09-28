import type { Endpoint, HttpMethod } from "../urls/types.js";
import { baseUrlFor } from "../urls/bases.js";
import { endpointGroups, listEndpoints } from "../urls/catalog.js";

/** Prints catalog endpoints for the `endpoints` and `describe` commands. */
export class EndpointService {
  printEndpointList(filter: { group?: string; method?: HttpMethod }): void {
    if (listEndpoints().length === 0) {
      console.error("The catalog is empty. Add endpoints in src/urls/catalog.ts.");
      return;
    }
    this.assertKnownGroup(filter.group);

    const items = listEndpoints(filter);
    if (items.length === 0) {
      throw new Error("No endpoints match that filter.");
    }

    const idWidth = Math.max(...items.map((item) => item.id.length));
    const lines = items.map((item) => {
      const id = item.id.padEnd(idWidth);
      return `${id}  ${item.method.padEnd(6)}  ${item.path}`;
    });
    console.log(lines.join("\n"));
  }

  printEndpointJson(filter: { group?: string; method?: HttpMethod }): void {
    this.assertKnownGroup(filter.group);
    const items = listEndpoints(filter).map((item) => this.toJson(item));
    console.log(JSON.stringify(items, null, 2));
  }

  printEndpoint(item: Endpoint): void {
    console.log(item.id);
    console.log(`${item.method} ${item.path}`);
    console.log("");
    console.log(item.summary);
    console.log("");
    console.log(`Service: ${item.service.description} (${baseUrlFor(item.service)})`);
    console.log(`Group: ${item.group}`);
    if (item.paged) {
      console.log("Paged: call follows @nextLink and returns every page");
    }
    this.printParams("Path parameters", item.pathParams.map((param) => ({ ...param, required: true })));
    this.printParams("Query parameters", item.queryParams);
    if (item.docsUrl) {
      console.log("");
      console.log(`Docs: ${item.docsUrl}`);
    }
  }

  private assertKnownGroup(group: string | undefined): void {
    if (group !== undefined && !endpointGroups().includes(group)) {
      throw new Error(`Unknown group "${group}". Groups: ${endpointGroups().join(", ")}.`);
    }
  }

  private printParams(
    title: string,
    params: readonly { name: string; description: string; required: boolean; default?: string }[],
  ): void {
    console.log("");
    console.log(title);
    if (params.length === 0) {
      console.log("  (none)");
      return;
    }
    for (const param of params) {
      const requirement = param.required ? "required" : "optional";
      const fallback = param.default !== undefined ? `, default ${param.default}` : "";
      console.log(`  ${param.name}  ${requirement}${fallback}`);
      console.log(`    ${param.description}`);
    }
  }

  private toJson(item: Endpoint) {
    return {
      id: item.id,
      group: item.group,
      method: item.method,
      summary: item.summary,
      path: item.path,
      service: item.service,
      pathParams: item.pathParams,
      queryParams: item.queryParams,
      paged: item.paged === true,
      docsUrl: item.docsUrl ?? null,
    };
  }
}
