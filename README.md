# partner-center-cli

Command line tool for exploring Microsoft Marketplace Partner Center REST APIs. 

This tool is for developers who want to better understand the Partner Center APIs. There are several APIs that expose the full capabilities of Partner Center. This sample uses the Partner Center Ingestion API.

It is implemented in TypeScript and there isn't much reason to run it with any command other than `npm run dev` as it's just a simple reference applicaiton.

Nothing in this tool updates or deletes data in Partner Center. All implmented operations are reads.

## Setting up Partner Center to run this script

Before running this script, you must add a Microsoft Entra ID applicaiton in Partner Center.
Reference the [offical Microsoft documentationon](https://learn.microsoft.com/en-us/partner-center/marketplace-offers/product-ingestion-api) how to do this.

Collect the information needed for the ENV VARs as you go. Especially ensure you keep a copy of the key (secret).

## Envrionmental variables

Settings may be read from a `.env` file in the project root directory. Copy `.env.example` to `.env` and fill it in. `.env` is gitignored.

| Variable | Flag | Default |
| --- | --- | --- |
| `PARTNER_CENTER_TENANT_ID` | none | none |
| `PARTNER_CENTER_CLIENT_ID` | none | none |
| `PARTNER_CENTER_CLIENT_SECRET` | none | none |
| `PRODUCT_INGESTION_BASE_URL` | `--base-url` | `https://graph.microsoft.com/rp/product-ingestion` |
| `PARTNER_CENTER_LOCALE` | `--locale` | `en-US` |

A flag overrides the environment. A variable already set in your shell overrides `.env`. Blank entries count as unset.

During development you can skip the build. Put `--` after `dev` so npm passes flags such as `--query` through to the CLI instead of reading them itself:

```sh
npm run dev -- endpoints
npm run dev -- call <id> --query name=value
```

## Script setup and run

Requires Node.js 20 or newer.

```sh
npm install
npm run dev help 
```

`npm run dev help` gives you all command line options in the CLI.

# Sample usage

- Get all products (offers) in your Partner Center account:

  `npm run dev call products.list`

- Get details about a specific product returned from the previous command:

  `npm run dev products get c322a73a-5320-4ce8-b3b6-c5236225fdae`

- Get all the resources the make up the product in the draft stage:

  `npm run dev -- products getResources c322a73a-5320-4ce8-b3b6-c5236225fdad --target-type draft`

## Supported endpoints

| Id | Request | Service |
| --- | --- | --- |
| `products.list` | `GET {PRODUCT_INGESTION_BASE_URL}/product?$version={schema-version}` | Product Ingestion API |
| `product.get` | `GET {PRODUCT_INGESTION_BASE_URL}/resource-tree/product/{productId}?targetType={target}&$version={schema-version}` | Product Ingestion API |
| `privateOffers.list` | `GET {PRODUCT_INGESTION_BASE_URL}/private-offer/query?$version={schema-version}` | Product Ingestion API |

`products.list` returns all products defined by the publisher. `$version` defaults to `2022-03-01-preview3`. Results are paged. The endpoint is marked `paged: true` in the catalog, so `call` follows `@nextLink` automatically and returns every product in one `value` array:

```sh
npm run dev call privateOffers.list
npm run dev call products.list
npm run dev call products.list --query type=softwareAsAService
npm run dev call products.list --query '$version=2022-03-01-preview3'   # quote $ names in the shell
```

Microsoft's docs show `targetType="preview"` with quotes, but the API rejects quoted values, so the value is sent without them. `live` returns HTTP 400 for a product that has never been published.

## PrivateOffersService

`PrivateOffersService` in `src/services/private-offers-service.ts` orchestrates calls for private offers.

- `getAllPrivateOffers()` calls the `privateOffers.list` URL, follows every `@nextLink`, and returns every private offer, including multiparty private offers. `$version` defaults to `2023-07-15`.

Private offer pages hold their items in a `privateOffers` array instead of `value`. The endpoint declares this with `pageItemsKey: "privateOffers"` in the catalog, so `call privateOffers.list` also follows every page.

```sh
npm run dev private-offers list
npm run dev call privateOffers.list
```

The Product Ingestion API requests tokens for `https://graph.microsoft.com`. See the [Product Ingestion API docs](https://learn.microsoft.com/en-us/partner-center/marketplace-offers/product-ingestion-api).



## Authentication

`AuthManager` in `src/auth/manager.ts` signs in with the client credentials grant. It posts `resource`, `client_id`, `client_secret`, and `grant_type=client_credentials` to `https://login.microsoftonline.com/{tenantId}/oauth2/token`, then caches the token until five minutes before it expires.

| URL | Used for |
| --- | --- |
| `https://login.microsoftonline.com` | Login base URL (`DEFAULT_LOGIN_BASE_URL`) |
| `https://api.partnercenter.microsoft.com` | Default `resource` (`DEFAULT_RESOURCE`) |

`call` requests a token for the `resource` declared on the endpoint's service, or the default when the service doesn't declare one. To test sign-in on its own:

```sh
npm run dev auth                                          # show the token expiry
npm run dev auth --print-token                            # also write the token to stdout
npm run dev auth --resource https://api.example.com       # request a token for another resource
```