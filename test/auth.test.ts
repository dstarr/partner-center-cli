import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthError, AuthManager, DEFAULT_RESOURCE } from "../src/auth/manager.js";

const credentials = {
  tenantId: "contoso.onmicrosoft.com",
  clientId: "client-id",
  clientSecret: "client secret&=",
  resource: "https://api.example.test",
};

function tokenResponse(fields: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(fields), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("AuthManager", () => {
  it("posts the client credentials form to the tenant token URL", async () => {
    let seenUrl = "";
    let seenInit: RequestInit | undefined;
    const auth = new AuthManager({
      ...credentials,
      now: () => 1_000_000,
      fetchImpl: async (url, init) => {
        seenUrl = String(url);
        seenInit = init;
        return tokenResponse({
          token_type: "Bearer",
          expires_in: "3599",
          expires_on: "5000",
          resource: "https://api.example.test",
          access_token: "token-1",
        });
      },
    });

    const token = await auth.getToken();

    assert.equal(
      seenUrl,
      "https://login.microsoftonline.com/contoso.onmicrosoft.com/oauth2/token",
    );
    assert.equal(seenInit?.method, "POST");
    const headers = new Headers(seenInit?.headers);
    assert.equal(headers.get("Accept"), "application/json");
    assert.equal(headers.get("return-client-request-id"), "true");
    assert.equal(
      headers.get("Content-Type"),
      "application/x-www-form-urlencoded; charset=utf-8",
    );
    const form = new URLSearchParams(String(seenInit?.body));
    assert.equal(form.get("resource"), "https://api.example.test");
    assert.equal(form.get("client_id"), "client-id");
    assert.equal(form.get("client_secret"), "client secret&=");
    assert.equal(form.get("grant_type"), "client_credentials");

    assert.equal(token.accessToken, "token-1");
    assert.equal(token.expiresAt.getTime(), 5_000_000);
  });

  it("reuses a fresh token and refreshes one near expiry", async () => {
    let now = 0;
    let calls = 0;
    const auth = new AuthManager({
      ...credentials,
      now: () => now,
      fetchImpl: async () => {
        calls += 1;
        return tokenResponse({ access_token: `token-${calls}`, expires_in: "3600" });
      },
    });

    assert.equal(await auth.getAccessToken(), "token-1");
    now = 30 * 60 * 1000;
    assert.equal(await auth.getAccessToken(), "token-1");
    now = 56 * 60 * 1000;
    assert.equal(await auth.getAccessToken(), "token-2");
    assert.equal(calls, 2);
  });

  it("shares one request between concurrent callers", async () => {
    let calls = 0;
    const auth = new AuthManager({
      ...credentials,
      fetchImpl: async () => {
        calls += 1;
        return tokenResponse({ access_token: "token", expires_in: "3600" });
      },
    });

    const tokens = await Promise.all([auth.getAccessToken(), auth.getAccessToken()]);
    assert.deepEqual(tokens, ["token", "token"]);
    assert.equal(calls, 1);
  });

  it("reports the Entra error without echoing the secret", async () => {
    const auth = new AuthManager({
      ...credentials,
      fetchImpl: async () =>
        tokenResponse(
          {
            error: "invalid_client",
            error_description: "AADSTS7000215: Invalid client secret provided.\r\nTrace ID: x",
          },
          401,
        ),
    });

    await assert.rejects(auth.getToken(), (error: unknown) => {
      assert.ok(error instanceof AuthError);
      assert.equal(error.status, 401);
      assert.match(error.message, /invalid_client: AADSTS7000215.* Trace ID: x/);
      assert.doesNotMatch(error.message, /client secret&=/);
      return true;
    });
  });

  it("rejects tenant ids that would change the login path", () => {
    assert.throws(
      () => new AuthManager({ ...credentials, tenantId: "../common" }),
      AuthError,
    );
  });

  it("lists every missing environment variable", () => {
    assert.throws(
      () =>
        AuthManager.fromEnv(
          { PARTNER_CENTER_CLIENT_ID: "id" },
          { resource: "https://api.example.test" },
        ),
      /PARTNER_CENTER_TENANT_ID, PARTNER_CENTER_CLIENT_SECRET/,
    );
  });

  it("defaults the resource to DEFAULT_RESOURCE", async () => {
    let form = new URLSearchParams();
    const { resource: _omit, ...withoutResource } = credentials;
    const auth = new AuthManager({
      ...withoutResource,
      fetchImpl: async (_url, init) => {
        form = new URLSearchParams(String(init?.body));
        return tokenResponse({ access_token: "token", expires_in: "3600" });
      },
    });
    await auth.getToken();
    assert.equal(form.get("resource"), DEFAULT_RESOURCE);
    assert.equal(DEFAULT_RESOURCE, "https://api.partnercenter.microsoft.com");
  });

  it("rejects a blank resource", () => {
    assert.throws(() => new AuthManager({ ...credentials, resource: " " }), /resource is required/);
  });
});
