export const DEFAULT_LOGIN_BASE_URL = "https://login.microsoftonline.com";
export const DEFAULT_RESOURCE = "https://api.partnercenter.microsoft.com";

/** Refresh tokens this long before they expire so in-flight calls don't race expiry. */
const EXPIRY_SKEW_MS = 5 * 60 * 1000;

const TENANT_PATTERN = /^[A-Za-z0-9.-]+$/;

export interface AuthCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

export interface AuthManagerOptions extends AuthCredentials {
  /** Resource (token audience) of the API the token is for. Defaults to DEFAULT_RESOURCE. */
  resource?: string;
  loginBaseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export interface AccessToken {
  accessToken: string;
  tokenType: string;
  expiresAt: Date;
  resource: string;
  clientRequestId: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly clientRequestId?: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Gets app-only tokens for an API resource with the client credentials grant
 * and caches them until shortly before they expire.
 */
export class AuthManager {
  private readonly credentials: AuthCredentials;
  private readonly resource: string;
  private readonly tokenUrl: URL;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private cached: AccessToken | undefined;
  private pending: Promise<AccessToken> | undefined;

  constructor(options: AuthManagerOptions) {
    const tenantId = requireValue(options.tenantId, "tenantId");
    if (!TENANT_PATTERN.test(tenantId)) {
      throw new AuthError(
        `Tenant id "${tenantId}" must be a GUID or a domain such as contoso.onmicrosoft.com.`,
      );
    }
    this.credentials = {
      tenantId,
      clientId: requireValue(options.clientId, "clientId"),
      clientSecret: requireValue(options.clientSecret, "clientSecret"),
    };
    this.resource = requireValue(options.resource ?? DEFAULT_RESOURCE, "resource");
    this.tokenUrl = new URL(
      `/${encodeURIComponent(tenantId)}/oauth2/token`,
      options.loginBaseUrl ?? DEFAULT_LOGIN_BASE_URL,
    );
    if (this.tokenUrl.protocol !== "https:") {
      throw new AuthError("Login URL must use https.");
    }
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
  }

  /** Reads credentials from PARTNER_CENTER_TENANT_ID, _CLIENT_ID, and _CLIENT_SECRET. */
  static fromEnv(
    env: NodeJS.ProcessEnv = process.env,
    options: Omit<AuthManagerOptions, keyof AuthCredentials> = {},
  ): AuthManager {
    const missing = [
      "PARTNER_CENTER_TENANT_ID",
      "PARTNER_CENTER_CLIENT_ID",
      "PARTNER_CENTER_CLIENT_SECRET",
    ].filter((name) => !env[name]?.trim());
    if (missing.length > 0) {
      throw new AuthError(
        `Missing ${missing.join(", ")}. Set them in .env.`,
      );
    }
    return new AuthManager({
      ...options,
      tenantId: env["PARTNER_CENTER_TENANT_ID"] ?? "",
      clientId: env["PARTNER_CENTER_CLIENT_ID"] ?? "",
      clientSecret: env["PARTNER_CENTER_CLIENT_SECRET"] ?? "",
    });
  }

  get loginUrl(): string {
    return this.tokenUrl.toString();
  }

  /** Returns a cached token while it is still valid, otherwise requests a new one. */
  async getToken(options: { forceRefresh?: boolean } = {}): Promise<AccessToken> {
    if (!options.forceRefresh && this.cached && this.isFresh(this.cached)) {
      return this.cached;
    }
    if (!this.pending) {
      this.pending = this.requestToken().finally(() => {
        this.pending = undefined;
      });
    }
    this.cached = await this.pending;
    return this.cached;
  }

  async getAccessToken(): Promise<string> {
    return (await this.getToken()).accessToken;
  }

  clear(): void {
    this.cached = undefined;
  }

  private isFresh(token: AccessToken): boolean {
    return token.expiresAt.getTime() - EXPIRY_SKEW_MS > this.now();
  }

  private async requestToken(): Promise<AccessToken> {
    const clientRequestId = crypto.randomUUID();
    const body = new URLSearchParams({
      resource: this.resource,
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret,
      grant_type: "client_credentials",
    });

    let response: Response;
    try {
      response = await this.fetchImpl(this.tokenUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
          "client-request-id": clientRequestId,
          "return-client-request-id": "true",
        },
        body: body.toString(),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new AuthError(`Token request to ${this.loginUrl} failed: ${reason}`, undefined, clientRequestId);
    }

    const requestId = response.headers.get("client-request-id") ?? clientRequestId;
    const text = await response.text();
    const payload = parseJson(text);

    if (!response.ok) {
      const code = stringField(payload, "error");
      const description = stringField(payload, "error_description")?.replace(/\s+/g, " ").trim();
      const detail = [code, description].filter(Boolean).join(": ") || text.slice(0, 200);
      throw new AuthError(
        `Token request failed with HTTP ${response.status}${detail ? ` (${detail})` : ""}.`,
        response.status,
        requestId,
      );
    }

    const accessToken = stringField(payload, "access_token");
    if (!accessToken) {
      throw new AuthError("Token response did not include access_token.", response.status, requestId);
    }

    return {
      accessToken,
      tokenType: stringField(payload, "token_type") ?? "Bearer",
      expiresAt: this.expiryFrom(payload),
      resource: stringField(payload, "resource") ?? this.resource,
      clientRequestId: requestId,
    };
  }

  /** The v1 endpoint returns expires_on (epoch seconds) and expires_in (seconds) as strings. */
  private expiryFrom(payload: unknown): Date {
    const expiresOn = Number(stringField(payload, "expires_on"));
    if (Number.isFinite(expiresOn) && expiresOn > 0) {
      return new Date(expiresOn * 1000);
    }
    const expiresIn = Number(stringField(payload, "expires_in"));
    if (Number.isFinite(expiresIn) && expiresIn > 0) {
      return new Date(this.now() + expiresIn * 1000);
    }
    return new Date(this.now());
  }
}

function requireValue(value: string, name: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new AuthError(`${name} is required.`);
  }
  return trimmed;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function stringField(payload: unknown, name: string): string | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }
  const value = (payload as Record<string, unknown>)[name];
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return undefined;
}
