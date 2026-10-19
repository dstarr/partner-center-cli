import { AuthManager } from "../auth/auth-manager.js";
import { sendApiRequest, type ApiResponse } from "../http/client.js";
import { ApiError, fetchAllPages } from "../http/pages.js";
import { buildUrl, getEndpoint } from "../urls/index.js";
import type { ConfigureJob } from "./job-service.js";
import { PrivateOfferFactory } from "./private-offer-configuration-factory.js";

/** `$schema` URLs used by private offer resources. */
export enum PrivateOfferSchemas {
  PrivateOffer = "https://schema.mp.microsoft.com/schema/private-offer/2023-07-15",
  /** Envelope for `/configure` requests; must match the endpoint's `$version`. */
  Configure = "https://schema.mp.microsoft.com/schema/configure/2022-07-01",
}


/** A private offer summary from the Product Ingestion API. */
export interface PrivateOffer {
  $schema: PrivateOfferSchemas.PrivateOffer;
  /** Durable id, such as `private-offer/77915369-...`. */
  id?: string;
  name: string;
  /** Such as `customerPromotion`, `cspPromotion`, or `multipartyPromotionOriginator`. */
  privateOfferType: string;
  /** Such as `draft`, `live`, or `withdrawn`. */
  state: string;
  subState?: string;
  variableStartDate?: boolean;
  start?: string;
  end?: string;
  acceptBy?: string;
  lastModified?: string;
  [property: string]: unknown;
}

/** A private offer configuration from the Product Ingestion API. */
export interface PrivateOfferConfiguration {
  $schema: PrivateOfferSchemas.Configure;
  resources: PrivateOffer[];
}

export interface PrivateOfferListFilter {
  name?: string;
  state?: string;
  subState?: string;
}

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
    const { url } = buildUrl({ endpoint });
    const { items } = await fetchAllPages<PrivateOffer>({
      url,
      accessToken: await this.auth.getAccessToken(),
      ...(endpoint.pageItemsKey !== undefined ? { itemsKey: endpoint.pageItemsKey } : {}),
      ...(this.options.timeoutMs !== undefined ? { timeoutMs: this.options.timeoutMs } : {}),
      ...(this.options.fetchImpl !== undefined ? { fetchImpl: this.options.fetchImpl } : {}),
    });
    return items;
  }

  /** Fetches every private offer, then applies optional client-side filters. */
  async listPrivateOffers(filters: PrivateOfferListFilter = {}): Promise<PrivateOffer[]> {
    return this.filterPrivateOffers(await this.getAllPrivateOffers(), filters);
  }

  filterPrivateOffers(offers: readonly PrivateOffer[], filters: PrivateOfferListFilter): PrivateOffer[] {
    const name = filters.name?.trim();
    const state = filters.state?.trim();
    const subState = filters.subState?.trim();
    if (!name && !state && !subState) {
      return [...offers];
    }
    const nameLower = name?.toLowerCase();
    return offers.filter((offer) => {
      if (nameLower !== undefined && !offer.name.toLowerCase().includes(nameLower)) {
        return false;
      }
      if (state !== undefined && offer.state !== state) {
        return false;
      }
      if (subState !== undefined && offer.subState !== subState) {
        return false;
      }
      return true;
    });
  }

  async createPrivateOffer(name: string): Promise<ConfigureJob> {

    const privateOfferFactory: PrivateOfferFactory = new PrivateOfferFactory();
                
    const privateOffer: PrivateOffer = await privateOfferFactory.createPrivateOffer(name);

    const privateOfferConfiguration: PrivateOfferConfiguration = {
        $schema: PrivateOfferSchemas.Configure,
        resources: [privateOffer],
    };

    return await this.postPrivateOfferConfiguration(privateOfferConfiguration);
  }

  /** Fetches one private offer. Accepts the id with or without the `private-offer/` prefix. */
  async getPrivateOffer(id: string): Promise<PrivateOffer> {
    
    const privateOfferId = id.trim().replace(/^private-offer\//, "");
    
    if (privateOfferId.length === 0) {
      throw new Error("Private offer id is required.");
    }
    
    const { url } = buildUrl({
      endpoint: getEndpoint("privateOffers.get"),
      pathParams: { id: privateOfferId },
    });

    const response = await sendApiRequest({
      url,
      method: "GET",
      accessToken: await this.auth.getAccessToken(),
      ...(this.options.timeoutMs !== undefined ? { timeoutMs: this.options.timeoutMs } : {}),
      ...(this.options.fetchImpl !== undefined ? { fetchImpl: this.options.fetchImpl } : {}),
    });

    if(response.status === 404) {
      throw new Error("Private offer not found");
    }

    if (!response.ok) {
      throw new ApiError(response);
    }
    
    return JSON.parse(response.bodyText) as PrivateOffer;
  }

  async postPrivateOfferConfiguration(configuration: PrivateOfferConfiguration) {
    
    const { url } = buildUrl({
      endpoint: getEndpoint("privateOffers.configure"),
    });

    const body: string = JSON.stringify(configuration, null, 2);

    console.log("--------------------------------");
    console.log(body);

    const response: ApiResponse = await sendApiRequest({
      url,
      method: "POST",
      accessToken: await this.auth.getAccessToken(),
      body,
      ...(this.options.timeoutMs !== undefined ? { timeoutMs: this.options.timeoutMs } : {}),
      ...(this.options.fetchImpl !== undefined ? { fetchImpl: this.options.fetchImpl } : {}),
    });

    if (!response.ok) {
      console.log("--------------------------------");
      
      const errorBody: string = JSON.parse(response.bodyText);
      console.log(JSON.stringify(errorBody, null, 2));

      throw new ApiError(response);
    }
    return JSON.parse(response.bodyText) as ConfigureJob;
  }

}
