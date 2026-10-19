import { AuthManager } from "../auth/auth-manager.js";
import { sendApiRequest, type ApiResponse } from "../http/client.js";
import { ApiError } from "../http/pages.js";
import { buildUrl, getEndpoint } from "../urls/index.js";

/** The asynchronous job returned by `/configure`. */
export interface ConfigureJob {
  $schema: string;
  jobId: string;
  /** Such as `notStarted`, `running`, or `completed`. */
  jobStatus: string;
  /** Such as `pending`, `succeeded`, or `failed`. */
  jobResult: string;
  jobStart?: string;
  jobEnd?: string;
  errors: { resourceId?: string; code: string; message: string }[];
}

export interface JobServiceOptions {
  /** Defaults to an AuthManager built from .env with the product ingestion resource. */
  auth?: AuthManager;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** Reads the status of jobs started by Product Ingestion `/configure` requests. */
export class JobService {
  private readonly auth: AuthManager;
  private readonly options: Omit<JobServiceOptions, "auth">;

  public constructor(options: JobServiceOptions = {}) {
    const { auth, ...rest } = options;
    this.options = rest;
    this.auth = auth ?? this.createDefaultAuth();
  }

  /** Fetches the current status of a job returned by an operation that returns a job ID. */
  public async getJobStatus(jobId: string): Promise<ConfigureJob> {
    const id = this.normalizeJobId(jobId);
    const { url } = buildUrl({
      endpoint: getEndpoint("jobs.get"),
      pathParams: { jobId: id },
    });
    const response = await this.sendGet(url);
    return this.parseJob(response);
  }

  private normalizeJobId(jobId: string): string {
    const id = jobId.trim();
    if (id.length === 0) {
      throw new Error("Job id is required.");
    }
    return id;
  }

  private parseJob(response: ApiResponse): ConfigureJob {
    if (!response.ok) {
      throw new ApiError(response);
    }
    return JSON.parse(response.bodyText) as ConfigureJob;
  }

  private createDefaultAuth(): AuthManager {
    const { resource } = getEndpoint("jobs.get").service;
    return AuthManager.fromEnv(process.env, resource ? { resource } : {});
  }

  private async sendGet(url: URL): Promise<ApiResponse> {
    return sendApiRequest({
      url,
      method: "GET",
      accessToken: await this.auth.getAccessToken(),
      ...(this.options.timeoutMs !== undefined ? { timeoutMs: this.options.timeoutMs } : {}),
      ...(this.options.fetchImpl !== undefined ? { fetchImpl: this.options.fetchImpl } : {}),
    });
  }
}
