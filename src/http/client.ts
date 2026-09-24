import type { HttpMethod } from "../urls/types.js";

export interface ApiResponse {
  status: number;
  ok: boolean;
  requestId: string;
  correlationId: string;
  bodyText: string;
}

export async function sendApiRequest(input: {
  url: URL;
  method: HttpMethod;
  accessToken: string;
  locale?: string;
  body?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<ApiResponse> {
  const token = input.accessToken.trim();
  if (token.length === 0) {
    throw new Error("Missing access token.");
  }

  const requestId = crypto.randomUUID();
  const correlationId = crypto.randomUUID();
  const headers = new Headers({
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "MS-RequestId": requestId,
    "MS-CorrelationId": correlationId,
  });
  if (input.locale) {
    headers.set("X-Locale", input.locale);
  }
  if (input.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(input.url, {
    method: input.method,
    headers,
    ...(input.body !== undefined ? { body: input.body } : {}),
    signal: AbortSignal.timeout(input.timeoutMs ?? 60_000),
  });
  const bodyText = await response.text();

  return {
    status: response.status,
    ok: response.ok,
    requestId: response.headers.get("MS-RequestId") ?? requestId,
    correlationId: response.headers.get("MS-CorrelationId") ?? correlationId,
    bodyText,
  };
}
