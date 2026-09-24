import { resolveBaseUrl, UrlBuildError } from "./bases.js";
import type { BuildUrlInput, BuiltRequest, Endpoint } from "./types.js";

const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g;
const ANY_BRACE = /\{[^}]*\}/g;
const PATH_PATTERN = /^(?:\/[A-Za-z0-9{}._-]+)+$/;

export function placeholderNames(path: string): string[] {
  return [...path.matchAll(PLACEHOLDER)].map((match) => {
    const name = match[1];
    if (!name) {
      throw new UrlBuildError(`Invalid placeholder in path ${path}.`);
    }
    return name;
  });
}

/** Checks that a catalog entry's path and parameter declarations agree. */
export function assertEndpointShape(endpoint: Endpoint): void {
  if (!/^[a-z][A-Za-z0-9]*(\.[a-z][A-Za-z0-9]*)+$/.test(endpoint.id)) {
    throw new Error(
      `Endpoint id "${endpoint.id}" must be dot-separated words starting with a lowercase letter, such as items.list.`,
    );
  }
  if (!endpoint.id.startsWith(`${endpoint.group}.`)) {
    throw new Error(`Endpoint "${endpoint.id}" must start with "${endpoint.group}."`);
  }
  if (!PATH_PATTERN.test(endpoint.path)) {
    throw new Error(
      `Endpoint "${endpoint.id}" path must be absolute, such as /v1/resource/{param}. Received ${endpoint.path}.`,
    );
  }
  if (endpoint.path.includes("?")) {
    throw new Error(`Endpoint "${endpoint.id}" must declare query parameters separately from the path.`);
  }

  const braces = [...endpoint.path.matchAll(ANY_BRACE)].map((match) => match[0]);
  const names = placeholderNames(endpoint.path);
  const validBraces = new Set(names.map((name) => `{${name}}`));
  for (const brace of braces) {
    if (!validBraces.has(brace)) {
      throw new Error(
        `Endpoint "${endpoint.id}" has invalid placeholder ${brace}. Use {camelCase}.`,
      );
    }
  }

  const declaredPath = endpoint.pathParams.map((param) => param.name);
  assertSameNames(endpoint.id, "path", names, declaredPath);

  const queryNames = endpoint.queryParams.map((param) => param.name);
  assertUnique(endpoint.id, "query", queryNames);
  for (const name of queryNames) {
    if (names.includes(name)) {
      throw new Error(
        `Endpoint "${endpoint.id}" uses "${name}" as both a path and query parameter.`,
      );
    }
  }
}

export function buildUrl(input: BuildUrlInput): BuiltRequest {
  const endpoint = input.endpoint;
  const strictQuery = input.strictQuery ?? true;
  const pathParams = input.pathParams ?? {};
  const query = input.query ?? {};
  const names = placeholderNames(endpoint.path);

  for (const name of Object.keys(pathParams)) {
    if (!names.includes(name)) {
      throw new UrlBuildError(
        `Unknown path parameter "${name}" for ${endpoint.id}. Expected ${formatNames(names)}.`,
      );
    }
  }

  let path = endpoint.path;
  for (const name of names) {
    const raw = pathParams[name];
    if (raw === undefined) {
      throw new UrlBuildError(
        `Missing path parameter "${name}" for ${endpoint.id}. Pass --param ${name}=<value>.`,
      );
    }
    const value = String(raw).trim();
    if (value.length === 0) {
      throw new UrlBuildError(`Path parameter "${name}" for ${endpoint.id} is empty.`);
    }
    path = path.replaceAll(`{${name}}`, encodeURIComponent(value));
  }

  const baseUrl = resolveBaseUrl({
    service: endpoint.service,
    ...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl } : {}),
  });
  const url = new URL(path, `${baseUrl}/`);

  const declaredQuery = new Set(endpoint.queryParams.map((param) => param.name));
  const missingQuery = endpoint.queryParams.filter(
    (param) => param.required && (query[param.name] === undefined || query[param.name] === null),
  );
  if (missingQuery.length > 0) {
    const names = missingQuery.map((param) => `"${param.name}"`).join(", ");
    const flags = missingQuery.map((param) => `--query ${param.name}=<value>`).join(" ");
    const noun = missingQuery.length === 1 ? "parameter" : "parameters";
    throw new UrlBuildError(
      `Missing query ${noun} ${names} for ${endpoint.id}. Pass ${flags}, or run "describe ${endpoint.id}" for details.`,
    );
  }
  for (const param of endpoint.queryParams) {
    const raw = query[param.name];
    if (raw === undefined || raw === null) {
      continue;
    }
    url.searchParams.append(param.name, String(raw));
  }

  const extras = Object.keys(query)
    .filter((name) => !declaredQuery.has(name))
    .sort();
  for (const name of extras) {
    if (names.includes(name)) {
      throw new UrlBuildError(
        `"${name}" is a path parameter for ${endpoint.id}. Pass it as a path parameter.`,
      );
    }
    if (strictQuery) {
      const known = endpoint.queryParams.map((param) => param.name);
      throw new UrlBuildError(
        `Unknown query parameter "${name}" for ${endpoint.id}. Expected ${formatNames(known)}. Use --allow-query to send it anyway.`,
      );
    }
    const raw = query[name];
    if (raw === undefined || raw === null) {
      continue;
    }
    url.searchParams.append(name, String(raw));
  }

  return {
    endpoint,
    method: endpoint.method,
    url,
    baseUrl,
  };
}

function assertSameNames(
  id: string,
  kind: string,
  inPath: readonly string[],
  declared: readonly string[],
): void {
  assertUnique(id, kind, declared);
  const pathSet = new Set(inPath);
  const declaredSet = new Set(declared);
  for (const name of pathSet) {
    if (!declaredSet.has(name)) {
      throw new Error(`Endpoint "${id}" uses {${name}} but does not declare that ${kind} parameter.`);
    }
  }
  for (const name of declaredSet) {
    if (!pathSet.has(name)) {
      throw new Error(`Endpoint "${id}" declares ${kind} parameter "${name}" that is not in the path.`);
    }
  }
}

function assertUnique(id: string, kind: string, names: readonly string[]): void {
  const seen = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) {
      throw new Error(`Endpoint "${id}" declares ${kind} parameter "${name}" more than once.`);
    }
    seen.add(name);
  }
}

function formatNames(names: readonly string[]): string {
  if (names.length === 0) {
    return "none";
  }
  return names.join(", ");
}
