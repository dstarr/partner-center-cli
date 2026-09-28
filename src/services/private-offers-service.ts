import { AuthManager } from "../auth/manager.js";
import { fetchAllPages } from "../http/pages.js";
import { buildUrl, getEndpoint } from "../urls/index.js";

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
}
