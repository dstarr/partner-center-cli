import { readFile } from "node:fs/promises";
import { AuthManager } from "../auth/manager.js";
import { buildUrl, getEndpoint } from "../urls/index.js";
import { sendApiRequest, type ApiResponse } from "../http/client.js";
import { ApiError, fetchAllPages } from "../http/pages.js";
import { formatBody, parseAssignments } from "../params.js";

/** Builds and sends catalog endpoint requests for the `url` and `call` commands. */
export class RequestService {
  resolveEndpointUrl(input: {
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

  async callEndpoint(input: {
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
    all?: boolean;
  }): Promise<void> {
    const endpoint = getEndpoint(input.id);
    const body = await this.readBody(input.body, input.bodyFile);
    if (body !== undefined && endpoint.method === "GET") {
      throw new Error(`${endpoint.id} is a GET and does not take a body.`);
    }
    if (input.all && endpoint.method !== "GET") {
      throw new Error("--all only applies to GET endpoints.");
    }

    const url = this.resolveEndpointUrl(input);
    if (input.dryRun) {
      console.error(`${endpoint.method} ${url.toString()}`);
      return;
    }

    const { resource } = endpoint.service;
    const token = await AuthManager.fromEnv(process.env, resource ? { resource } : {}).getAccessToken();

    if (input.all || endpoint.paged) {
      try {
        const { items, pages } = await fetchAllPages({
          url,
          accessToken: token,
          locale: input.locale,
          timeoutMs: input.timeoutMs,
          onRequest: (next) => console.error(`GET ${next.toString()}`),
        });
        console.error(`Pages: ${pages}, items: ${items.length}`);
        process.stdout.write(`${JSON.stringify({ value: items }, null, 2)}\n`);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw error;
        }
        this.reportFailure(error.response);
      }
      return;
    }

    console.error(`${endpoint.method} ${url.toString()}`);
    const response = await sendApiRequest({
      url,
      method: endpoint.method,
      accessToken: token,
      locale: input.locale,
      ...(body !== undefined ? { body } : {}),
      timeoutMs: input.timeoutMs,
    });

    if (!response.ok) {
      this.reportFailure(response);
      return;
    }
    this.printTrace(response);
    const formatted = formatBody(response.bodyText);
    if (formatted.length > 0) {
      process.stdout.write(formatted);
    }
  }

  /** Writes a failed response to stderr and sets a failing exit code. */
  reportFailure(response: ApiResponse): void {
    this.printTrace(response);
    const formatted = formatBody(response.bodyText);
    if (formatted.length > 0) {
      process.stderr.write(formatted);
    } else if (response.status === 401 || response.status === 403) {
      console.error(
        "The API returned no error body. The token was issued, but the app may not be authorized for this API.",
      );
    }
    process.exitCode = 1;
  }

  private printTrace(response: ApiResponse): void {
    console.error(`HTTP ${response.status}`);
    console.error(`MS-RequestId: ${response.requestId}`);
    console.error(`MS-CorrelationId: ${response.correlationId}`);
  }

  private async readBody(body: string | undefined, bodyFile: string | undefined): Promise<string | undefined> {
    if (body !== undefined && bodyFile !== undefined) {
      throw new Error("Pass either --body or --body-file, not both.");
    }
    if (bodyFile !== undefined) {
      return readFile(bodyFile, "utf8");
    }
    return body;
  }
}
