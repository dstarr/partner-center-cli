import { AuthManager } from "../auth/manager.js";
import { sendApiRequest } from "../http/client.js";
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
  /** Replaces the service base URL, including its path. */
  baseUrl?: string;
  locale?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** Reads the status of jobs started by Product Ingestion `/configure` requests. */
export class JobService {

  private readonly auth: AuthManager;
  private readonly options: Omit<JobServiceOptions, "auth">;

  constructor(options: JobServiceOptions = {}) {
    const { auth, ...rest } = options;
    this.options = rest;
    if (auth) {
      this.auth = auth;
    } else {
      const { resource } = getEndpoint("jobs.get").service;
      this.auth = AuthManager.fromEnv(process.env, resource ? { resource } : {});
    }
  }

  /** Fetches the current status of a job returned by an operation that returns a job ID. */
  async getJobStatus(jobId: string): Promise<ConfigureJob> {
    const id = jobId.trim();
    if (id.length === 0) {
      throw new Error("Job id is required.");
    }
    const { url } = buildUrl({
      endpoint: getEndpoint("jobs.get"),
      ...(this.options.baseUrl !== undefined ? { baseUrl: this.options.baseUrl } : {}),
      pathParams: { jobId: id },
    });
    const response = await sendApiRequest({
      url,
      method: "GET",
      accessToken: await this.auth.getAccessToken(),
      ...(this.options.locale !== undefined ? { locale: this.options.locale } : {}),
      ...(this.options.timeoutMs !== undefined ? { timeoutMs: this.options.timeoutMs } : {}),
      ...(this.options.fetchImpl !== undefined ? { fetchImpl: this.options.fetchImpl } : {}),
    });
    if (!response.ok) {
      throw new ApiError(response);
    }
    return JSON.parse(response.bodyText) as ConfigureJob;
  }
}
