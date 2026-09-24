import { readFile } from "node:fs/promises";
import { buildUrl, getEndpoint, type CloudId } from "../urls/index.js";
import { sendPartnerCenterRequest } from "../http/client.js";
import { formatBody, parseAssignments } from "../params.js";

export function resolveEndpointUrl(input: {
  id: string;
  cloud: CloudId;
  baseUrl?: string;
  params: readonly string[];
  query: readonly string[];
  strictQuery: boolean;
}): URL {
  const endpoint = getEndpoint(input.id);
  const built = buildUrl({
    endpoint,
    cloud: input.cloud,
    ...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl } : {}),
    pathParams: parseAssignments(input.params, "--param"),
    query: parseAssignments(input.query, "--query"),
    strictQuery: input.strictQuery,
  });
  return built.url;
}

export async function callEndpoint(input: {
  id: string;
  cloud: CloudId;
  baseUrl?: string;
  params: readonly string[];
  query: readonly string[];
  strictQuery: boolean;
  token?: string;
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

  const token = input.token ?? process.env["PARTNER_CENTER_ACCESS_TOKEN"];
  if (!token) {
    throw new Error("Missing access token. Pass --token or set PARTNER_CENTER_ACCESS_TOKEN.");
  }

  const response = await sendPartnerCenterRequest({
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
