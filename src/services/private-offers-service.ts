import { AuthManager } from "../auth/auth-manager.js";
import { sendApiRequest, type ApiResponse } from "../http/client.js";
import { ApiError, fetchAllPages } from "../http/pages.js";
import { buildUrl, getEndpoint } from "../urls/index.js";
import type { ConfigureJob } from "./job-service.js";
import { PrivateOfferCollection, PrivateOfferListCriteria } from "./private-offer-collection.js";
import { PrivateOfferFactory } from "./private-offer-configuration-factory.js";
import { PrivateOfferStatePayloadBuilder } from "./private-offer-state-payload.js";
import type {
  PrivateOffer,
  PrivateOfferConfiguration,
  PrivateOfferListFilter,
} from "./private-offer-types.js";
import { PrivateOfferSchemas } from "./private-offer-types.js";

export type { PrivateOffer, PrivateOfferConfiguration, PrivateOfferListFilter } from "./private-offer-types.js";
export { PrivateOfferSchemas } from "./private-offer-types.js";

export interface PrivateOffersServiceOptions {
  /** Defaults to an AuthManager built from .env with the product ingestion resource. */
  auth?: AuthManager;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** Orchestrates calls for private offers defined in Partner Center. */
export class PrivateOffersService {

  private readonly auth: AuthManager;
  private readonly options: Omit<PrivateOffersServiceOptions, "auth">;
  private readonly statePayloadBuilder = new PrivateOfferStatePayloadBuilder();

  public constructor(options: PrivateOffersServiceOptions = {}) {
    const { auth, ...rest } = options;
    this.options = rest;
    this.auth = auth ?? this.createDefaultAuth();
  }

  /** Fetches every private offer, including multiparty private offers, following all result pages. */
  private async getAllPrivateOffers(): Promise<PrivateOffer[]> {
    const endpoint = getEndpoint("privateOffers.list");
    const { url } = buildUrl({ endpoint });
    const { items } = await fetchAllPages<PrivateOffer>({
      url,
      accessToken: await this.auth.getAccessToken(),
      ...(endpoint.pageItemsKey !== undefined ? { itemsKey: endpoint.pageItemsKey } : {}),
      ...this.requestOptions(),
    });
    return items;
  }

  /** Fetches every private offer, then applies optional client-side filters. */
  public async listPrivateOffers(filters: PrivateOfferListFilter = {}): Promise<PrivateOffer[]> {
    const offers = await this.getAllPrivateOffers();
    return this.filterOffers(offers, filters);
  }

  public async createPrivateOffer(name: string): Promise<ConfigureJob> {
    const privateOffer = await new PrivateOfferFactory().createPrivateOffer(name);
    return this.postPrivateOfferConfiguration({
      $schema: PrivateOfferSchemas.Configure,
      resources: [privateOffer],
    });
  }

  /** Fetches one private offer. Accepts the id with or without the `private-offer/` prefix. */
  public async getPrivateOffer(id: string): Promise<PrivateOffer> {
    const privateOfferId = this.normalizePrivateOfferId(id);
    const { url } = buildUrl({
      endpoint: getEndpoint("privateOffers.get"),
      pathParams: { id: privateOfferId },
    });
    const response = await this.sendGet(url);
    return this.parsePrivateOfferGetResponse(response);
  }

  /** Withdraws a private offer (API sets state to `draft`). */
  public async withdrawPrivateOffer(id: string): Promise<ConfigureJob> {
    return this.configurePrivateOfferState(id, (offer) => this.statePayloadBuilder.buildWithdrawPayload(offer));
  }

  /** Sets a private offer's state to `deleted` via configure. */
  public async deletePrivateOffer(id: string): Promise<ConfigureJob> {
    return this.configurePrivateOfferState(id, (offer) => this.statePayloadBuilder.buildDeletePayload(offer));
  }

  public async postPrivateOfferConfiguration(configuration: PrivateOfferConfiguration): Promise<ConfigureJob> {
    const { url } = buildUrl({
      endpoint: getEndpoint("privateOffers.configure"),
    });
    const body = JSON.stringify(configuration, null, 2);
    this.logConfigureRequest(body);
    const response = await this.sendPost(url, body);
    return this.parseConfigureResponse(response);
  }

  private async configurePrivateOfferState(
    id: string,
    buildResource: (offer: PrivateOffer) => PrivateOffer,
  ): Promise<ConfigureJob> {
    const privateOffer = await this.getPrivateOffer(id);
    return this.postPrivateOfferConfiguration({
      $schema: PrivateOfferSchemas.Configure,
      resources: [buildResource(privateOffer)],
    });
  }

  private filterOffers(offers: readonly PrivateOffer[], filters: PrivateOfferListFilter): PrivateOffer[] {
    return new PrivateOfferCollection(offers)
      .apply(PrivateOfferListCriteria.from(filters))
      .toArray();
  }

  private createDefaultAuth(): AuthManager {
    const { resource } = getEndpoint("privateOffers.list").service;
    return AuthManager.fromEnv(process.env, resource ? { resource } : {});
  }

  private normalizePrivateOfferId(id: string): string {
    const privateOfferId = id.trim().replace(/^private-offer\//, "");
    if (privateOfferId.length === 0) {
      throw new Error("Private offer id is required.");
    }
    return privateOfferId;
  }

  private parsePrivateOfferGetResponse(response: ApiResponse): PrivateOffer {
    if (response.status === 404) {
      throw new Error("Private offer not found");
    }
    if (!response.ok) {
      throw new ApiError(response);
    }
    return JSON.parse(response.bodyText) as PrivateOffer;
  }

  private logConfigureRequest(body: string): void {
    console.log("--------------------------------");
    console.log(body);
  }

  private parseConfigureResponse(response: ApiResponse): ConfigureJob {
    if (!response.ok) {
      this.logConfigureError(response);
      throw new ApiError(response);
    }
    return JSON.parse(response.bodyText) as ConfigureJob;
  }

  private logConfigureError(response: ApiResponse): void {
    console.log("--------------------------------");
    const errorBody: string = JSON.parse(response.bodyText);
    console.log(JSON.stringify(errorBody, null, 2));
  }

  private async sendGet(url: URL): Promise<ApiResponse> {
    return sendApiRequest({
      url,
      method: "GET",
      accessToken: await this.auth.getAccessToken(),
      ...this.requestOptions(),
    });
  }

  private async sendPost(url: URL, body: string): Promise<ApiResponse> {
    return sendApiRequest({
      url,
      method: "POST",
      accessToken: await this.auth.getAccessToken(),
      body,
      ...this.requestOptions(),
    });
  }

  private requestOptions(): { timeoutMs?: number; fetchImpl?: typeof fetch } {
    return {
      ...(this.options.timeoutMs !== undefined ? { timeoutMs: this.options.timeoutMs } : {}),
      ...(this.options.fetchImpl !== undefined ? { fetchImpl: this.options.fetchImpl } : {}),
    };
  }

}
