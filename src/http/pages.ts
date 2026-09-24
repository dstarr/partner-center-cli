import { sendApiRequest, type ApiResponse } from "./client.js";

const MAX_PAGES = 500;

export class ApiError extends Error {
  constructor(readonly response: ApiResponse) {
    super(`Request failed with HTTP ${response.status}.`);
    this.name = "ApiError";
  }
}

/**
 * GETs a collection and follows `@nextLink` until the last page.
 * Every page must be JSON with a `value` array.
 */
export async function fetchAllPages<T = unknown>(input: {
  url: URL;
  accessToken: string;
  locale?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  onRequest?: (url: URL) => void;
}): Promise<{ items: T[]; pages: number }> {
  const items: T[] = [];
  let next: URL | undefined = input.url;
  let pages = 0;

  while (next) {
    if (pages >= MAX_PAGES) {
      throw new Error(`Stopped after ${MAX_PAGES} pages.`);
    }
    input.onRequest?.(next);
    const response = await sendApiRequest({
      url: next,
      method: "GET",
      accessToken: input.accessToken,
      ...(input.locale !== undefined ? { locale: input.locale } : {}),
      ...(input.timeoutMs !== undefined ? { timeoutMs: input.timeoutMs } : {}),
      ...(input.fetchImpl !== undefined ? { fetchImpl: input.fetchImpl } : {}),
    });
    pages += 1;
    if (!response.ok) {
      throw new ApiError(response);
    }

    const page = parsePage(response.bodyText);
    items.push(...(page.value as T[]));
    next = page.nextLink ? sameOriginUrl(page.nextLink, input.url) : undefined;
  }

  return { items, pages };
}

function parsePage(text: string): { value: unknown[]; nextLink?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Expected a JSON response with a value array.");
  }
  const record = (parsed ?? {}) as Record<string, unknown>;
  if (!Array.isArray(record["value"])) {
    throw new Error("Expected a JSON response with a value array.");
  }
  const link = record["@nextLink"] ?? record["@odata.nextLink"] ?? record["nextLink"];
  return {
    value: record["value"],
    ...(typeof link === "string" && link.length > 0 ? { nextLink: link } : {}),
  };
}

/** The access token is only sent to the host that served the first page. */
function sameOriginUrl(link: string, first: URL): URL {
  const url = new URL(link, first);
  if (url.origin !== first.origin) {
    throw new Error(`Refusing to follow a next link to another host: ${url.origin}`);
  }
  return url;
}
