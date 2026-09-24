import type { Endpoint, HttpMethod } from "../urls/types.js";
import { endpointGroups, listEndpoints } from "../urls/catalog.js";

export function printEndpointList(filter: { group?: string; method?: HttpMethod }): void {
  if (listEndpoints().length === 0) {
    console.error("The catalog is empty. Add endpoints in src/urls/catalog.ts.");
    return;
  }
  if (filter.group !== undefined && !endpointGroups().includes(filter.group)) {
    throw new Error(
      `Unknown group "${filter.group}". Groups: ${endpointGroups().join(", ")}.`,
    );
  }

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

export function printEndpointJson(filter: { group?: string; method?: HttpMethod }): void {
  if (filter.group !== undefined && !endpointGroups().includes(filter.group)) {
    throw new Error(
      `Unknown group "${filter.group}". Groups: ${endpointGroups().join(", ")}.`,
    );
  }
  const items = listEndpoints(filter).map(toJson);
  console.log(JSON.stringify(items, null, 2));
}

export function printEndpoint(item: Endpoint): void {
  console.log(item.id);
  console.log(`${item.method} ${item.path}`);
  console.log("");
  console.log(item.summary);
  console.log("");
  console.log(`Service: ${item.service}`);
  console.log(`Group: ${item.group}`);
  printParams("Path parameters", item.pathParams.map((param) => ({ ...param, required: true })));
  printParams("Query parameters", item.queryParams);
  if (item.docsUrl) {
    console.log("");
    console.log(`Docs: ${item.docsUrl}`);
  }
}

function printParams(
  title: string,
  params: readonly { name: string; description: string; required: boolean }[],
): void {
  console.log("");
  console.log(title);
  if (params.length === 0) {
    console.log("  (none)");
    return;
  }
  for (const param of params) {
    const requirement = param.required ? "required" : "optional";
    console.log(`  ${param.name}  ${requirement}`);
    console.log(`    ${param.description}`);
  }
}

function toJson(item: Endpoint) {
  return {
    id: item.id,
    group: item.group,
    method: item.method,
    summary: item.summary,
    path: item.path,
    service: item.service,
    pathParams: item.pathParams,
    queryParams: item.queryParams,
    docsUrl: item.docsUrl ?? null,
  };
}
