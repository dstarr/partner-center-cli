import { AuthManager } from "../auth/manager.js";
import { sendApiRequest } from "../http/client.js";
import { ApiError, fetchAllPages } from "../http/pages.js";
import { buildUrl, getEndpoint } from "../urls/index.js";

/** `$schema` URLs used by private offer resources. */
export enum PrivateOfferSchemas {
  PrivateOffer = "https://schema.mp.microsoft.com/schema/private-offer/2023-07-15",
  /** Envelope for `/configure` requests; must match the endpoint's `$version`. */
  Configure = "https://schema.mp.microsoft.com/schema/configure/2022-07-01",
}

export interface PrivateOfferConfiguration {
  $schema: string;
  resources: PrivateOffer[];
}

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

/** A private offer summary from the Product Ingestion API. */
export interface PrivateOffer {
  $schema: string;
  /** Durable id, such as `private-offer/77915369-...`. */
  id: string;
  name: string;
  /** Such as `customerPromotion`, `cspPromotion`, or `multipartyPromotionOriginator`. */
  privateOfferType: string;
  /** Such as `draft`, `live`, or `withdrawn`. */
  state: string;
  variableStartDate?: boolean;
  start?: string;
  end?: string;
  acceptBy?: string;
  lastModified?: string;
  [property: string]: unknown;
}

export interface PrivateOffersServiceOptions {
  /** Defaults to an AuthManager built from .env with the product ingestion resource. */
  auth?: AuthManager;
  /** Replaces the service base URL, including its path. */
  baseUrl?: string;
  locale?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** Orchestrates calls for private offers defined in Partner Center. */
export class PrivateOffersService {
  
  private readonly auth: AuthManager;
  private readonly options: Omit<PrivateOffersServiceOptions, "auth">;

  constructor(options: PrivateOffersServiceOptions = {}) {
    const { auth, ...rest } = options;
    this.options = rest;
    if (auth) {
      this.auth = auth;
    } else {
      const { resource } = getEndpoint("privateOffers.list").service;
      this.auth = AuthManager.fromEnv(process.env, resource ? { resource } : {});
    }
  }

  /** Fetches every private offer, including multiparty private offers, following all result pages. */
  async getAllPrivateOffers(): Promise<PrivateOffer[]> {
    const endpoint = getEndpoint("privateOffers.list");
    const { url } = buildUrl({
      endpoint,
      ...(this.options.baseUrl !== undefined ? { baseUrl: this.options.baseUrl } : {}),
    });
    const { items } = await fetchAllPages<PrivateOffer>({
      url,
      accessToken: await this.auth.getAccessToken(),
      ...(endpoint.pageItemsKey !== undefined ? { itemsKey: endpoint.pageItemsKey } : {}),
      ...(this.options.locale !== undefined ? { locale: this.options.locale } : {}),
      ...(this.options.timeoutMs !== undefined ? { timeoutMs: this.options.timeoutMs } : {}),
      ...(this.options.fetchImpl !== undefined ? { fetchImpl: this.options.fetchImpl } : {}),
    });
    return items;
  }

  /** Fetches one private offer. Accepts the id with or without the `private-offer/` prefix. */
  async getPrivateOffer(id: string): Promise<PrivateOffer> {
    const privateOfferId = id.trim().replace(/^private-offer\//, "");
    if (privateOfferId.length === 0) {
      throw new Error("Private offer id is required.");
    }
    const { url } = buildUrl({
      endpoint: getEndpoint("privateOffers.get"),
      ...(this.options.baseUrl !== undefined ? { baseUrl: this.options.baseUrl } : {}),
      pathParams: { id: privateOfferId },
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
    return JSON.parse(response.bodyText) as PrivateOffer;
  }

  async postPrivateOfferConfiguration(configuration: PrivateOfferConfiguration): Promise<ConfigureJob> {
    
    const { url } = buildUrl({
      endpoint: getEndpoint("privateOffers.configure"),
      ...(this.options.baseUrl !== undefined ? { baseUrl: this.options.baseUrl } : {}),
    });

    const body = JSON.stringify(configuration);
    
    console.log(configuration, null, 2);

    const response = await sendApiRequest({
      url,
      method: "POST",
      accessToken: await this.auth.getAccessToken(),
      body,
      ...(this.options.locale !== undefined ? { locale: this.options.locale } : {}),
      ...(this.options.timeoutMs !== undefined ? { timeoutMs: this.options.timeoutMs } : {}),
      ...(this.options.fetchImpl !== undefined ? { fetchImpl: this.options.fetchImpl } : {}),
    });
    if (!response.ok) {
      throw new ApiError(response);
    }
    return JSON.parse(response.bodyText) as ConfigureJob;
  }

  /** Fetches the current status of a job returned by `postPrivateOfferConfiguration`. */
  async getConfigureJobStatus(jobId: string): Promise<ConfigureJob> {
    const { url } = buildUrl({
      endpoint: getEndpoint("configure.status"),
      ...(this.options.baseUrl !== undefined ? { baseUrl: this.options.baseUrl } : {}),
      pathParams: { jobId },
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
