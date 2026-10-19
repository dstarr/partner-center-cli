import type { PrivateOffer, PrivateOfferListFilter } from "./private-offer-types.js";

/** Normalized client-side filter criteria for private offers. */
export class PrivateOfferListCriteria {
  private constructor(
    private readonly name?: string,
    private readonly state?: string,
    private readonly subState?: string,
  ) {}

  public static from(input: PrivateOfferListFilter = {}): PrivateOfferListCriteria {
    return new PrivateOfferListCriteria(
      input.name?.trim() || undefined,
      input.state?.trim() || undefined,
      input.subState?.trim() || undefined,
    );
  }

  public get isEmpty(): boolean {
    return this.name === undefined && this.state === undefined && this.subState === undefined;
  }

  public matches(offer: PrivateOffer): boolean {
    return this.matchesName(offer) && this.matchesState(offer) && this.matchesSubState(offer);
  }

  private matchesName(offer: PrivateOffer): boolean {
    if (this.name === undefined) {
      return true;
    }
    return offer.name.toLowerCase().includes(this.name.toLowerCase());
  }

  private matchesState(offer: PrivateOffer): boolean {
    if (this.state === undefined) {
      return true;
    }
    return offer.state === this.state;
  }

  private matchesSubState(offer: PrivateOffer): boolean {
    if (this.subState === undefined) {
      return true;
    }
    return offer.subState === this.subState;
  }
}

/** In-memory collection of private offer summaries (aggregate for list/filter operations). */
export class PrivateOfferCollection {
  public constructor(private readonly offers: readonly PrivateOffer[]) {}

  public apply(criteria: PrivateOfferListCriteria): PrivateOfferCollection {
    if (criteria.isEmpty) {
      return this;
    }
    return new PrivateOfferCollection(this.offers.filter((offer) => criteria.matches(offer)));
  }

  public toArray(): PrivateOffer[] {
    return [...this.offers];
  }
}
