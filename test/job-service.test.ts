import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthManager } from "../src/auth/auth-manager.js";
import { ApiError } from "../src/http/pages.js";
import { JobService } from "../src/services/job-service.js";

const BASE = "https://graph.example.test/rp/product-ingestion";

function fakeAuth(): AuthManager {
  return new AuthManager({
    tenantId: "contoso.onmicrosoft.com",
    clientId: "client-id",
    clientSecret: "secret",
    resource: "https://graph.microsoft.com",
    fetchImpl: async () =>
      new Response(JSON.stringify({ access_token: "token", expires_in: "3600" }), { status: 200 }),
  });
}

describe("JobService.getJobStatus", () => {
  it("fetches the job status from /configure/{jobId}/status", async () => {
    const seen: string[] = [];
    const service = new JobService({
      auth: fakeAuth(),
      baseUrl: BASE,
      fetchImpl: async (url) => {
        seen.push(String(url));
        return new Response(
          JSON.stringify({ jobId: "job-1", jobStatus: "completed", jobResult: "succeeded", errors: [] }),
          { status: 200 },
        );
      },
    });

    const job = await service.getJobStatus(" job-1 ");

    assert.equal(job.jobResult, "succeeded");
    assert.deepEqual(seen, [`${BASE}/configure/job-1/status?$version=2022-07-01`]);
  });

  it("throws ApiError when the request fails", async () => {
    const service = new JobService({
      auth: fakeAuth(),
      baseUrl: BASE,
      fetchImpl: async () => new Response("{}", { status: 404 }),
    });
    await assert.rejects(service.getJobStatus("missing"), ApiError);
  });

  it("rejects an empty job id", async () => {
    const service = new JobService({ auth: fakeAuth(), baseUrl: BASE, fetchImpl: async () => new Response("{}") });
    await assert.rejects(service.getJobStatus("  "), /Job id is required/);
  });
});
