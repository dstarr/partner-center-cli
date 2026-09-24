import { readFile } from "node:fs/promises";
import { AuthManager } from "../auth/manager.js";
import { buildUrl, getEndpoint, getService } from "../urls/index.js";
import { sendApiRequest } from "../http/client.js";
import { formatBody, parseAssignments } from "../params.js";

export function resolveEndpointUrl(input: {
  id: string;
  baseUrl?: string;
  params: readonly string[];
  query: readonly string[];
  strictQuery: boolean;
}): URL {
  const endpoint = getEndpoint(input.id);
  const built = buildUrl({
    endpoint,
    ...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl } : {}),
    pathParams: parseAssignments(input.params, "--param"),
    query: parseAssignments(input.query, "--query"),
    strictQuery: input.strictQuery,
  });
  return built.url;
}

export async function callEndpoint(input: {
  id: string;
  baseUrl?: string;
  params: readonly string[];
  query: readonly string[];
  strictQuery: boolean;
  locale: string;
  body?: string;
  bodyFile?: string;
  dryRun: boolean;
  timeoutMs: number;
}): Promise<void> {
  const endpoint = getEndpoint(input.id);
  const body = await readBody(input.body, input.bodyFile);
  if (body !== undefined && endpoint.method === "GET") {
    throw new Error(`${endpoint.id} is a GET and does not take a body.`);
  }

  const url = resolveEndpointUrl(input);
  console.error(`${endpoint.method} ${url.toString()}`);
  if (input.dryRun) {
    return;
  }

  const { resource } = getService(endpoint.service);
  const token = await AuthManager.fromEnv(process.env, resource ? { resource } : {}).getAccessToken();

  const response = await sendApiRequest({
    url,
    method: endpoint.method,
    accessToken: token,
    locale: input.locale,
    ...(body !== undefined ? { body } : {}),
    timeoutMs: input.timeoutMs,
  });

  console.error(`HTTP ${response.status}`);
  console.error(`MS-RequestId: ${response.requestId}`);
  console.error(`MS-CorrelationId: ${response.correlationId}`);

  const formatted = formatBody(response.bodyText);
  if (response.ok) {
    if (formatted.length > 0) {
      process.stdout.write(formatted);
    }
    return;
  }

  if (formatted.length > 0) {
    process.stderr.write(formatted);
  } else if (response.status === 401 || response.status === 403) {
    console.error(
      "The API returned no error body. The token was issued, but the app may not be authorized for this API.",
    );
  }
  process.exitCode = 1;
}

async function readBody(body: string | undefined, bodyFile: string | undefined): Promise<string | undefined> {
  if (body !== undefined && bodyFile !== undefined) {
    throw new Error("Pass either --body or --body-file, not both.");
  }
  if (bodyFile !== undefined) {
    return readFile(bodyFile, "utf8");
  }
  return body;
}
