# partner-center-cli

Command line tool for exploring REST APIs. Requests are chosen from a catalog of endpoints, so URLs are built from one path template instead of being assembled at each call site.

## Supported endpoints

| Id | Request | Service |
| --- | --- | --- |
| `products.list` | `GET {PRODUCT_INGESTION_BASE_URL}/product?$version={schema-version}` | Product Ingestion API |
| `product.get` | `GET {PRODUCT_INGESTION_BASE_URL}/resource-tree/product/{productId}?targetType={target}&$version={schema-version}` | Product Ingestion API |
| `privateOffers.list` | `GET {PRODUCT_INGESTION_BASE_URL}/private-offer/query?$version={schema-version}` | Product Ingestion API |

`products.list` returns all products defined by the publisher. `$version` defaults to `2022-03-01-preview3`. Results are paged. The endpoint is marked `paged: true` in the catalog, so `call` follows `@nextLink` automatically and returns every product in one `value` array:

```sh
partner-center-cli call products.list
partner-center-cli call products.list --query type=softwareAsAService
partner-center-cli call products.list --query '$version=2022-03-01-preview3'   # quote $ names in the shell
```

## ProductsService

`ProductsService` in `src/services/products-service.ts` orchestrates calls for products.

- `getAllProducts()` calls the `products.list` URL, follows every `@nextLink`, and returns the products as an array.
- `getProduct(productId, { targetType })` calls the `product.get` URL and returns the product's resource tree: the product plus its plans, listings, pricing, and submissions. `productId` may include the `product/` prefix. `targetType` is `draft` (the default when omitted), `preview`, or `live`. `$version` defaults to `2022-03-01-preview5`.

```ts
const manager = new ProductsService();
const products = await manager.getAllProducts();
const tree = await manager.getProduct(products[0].id, { targetType: "preview" });
```

From the command line:

```sh
partner-center-cli products list
partner-center-cli products get product/27494b66-e9d3-4b2d-848b-5ce0543abd90 --target-type preview
partner-center-cli products getSchemas product/27494b66-e9d3-4b2d-848b-5ce0543abd90 --target-type preview   # one $schema per line
partner-center-cli products getResourceIds product/27494b66-e9d3-4b2d-848b-5ce0543abd90   # one resource id per line
partner-center-cli products getResourceIds product/27494b66-e9d3-4b2d-848b-5ce0543abd90 --schema Plan   # only plan ids
partner-center-cli products getResources product/27494b66-e9d3-4b2d-848b-5ce0543abd90   # one JSON resource per line (JSON Lines)
partner-center-cli products getResources product/27494b66-e9d3-4b2d-848b-5ce0543abd90 --schema Plan | jq .alias
```

Microsoft's docs show `targetType="preview"` with quotes, but the API rejects quoted values, so the value is sent without them. `live` returns HTTP 400 for a product that has never been published.

## PrivateOffersService

`PrivateOffersService` in `src/services/private-offers-service.ts` orchestrates calls for private offers.

- `getAllPrivateOffers()` calls the `privateOffers.list` URL, follows every `@nextLink`, and returns every private offer, including multiparty private offers. `$version` defaults to `2023-07-15`.

Private offer pages hold their items in a `privateOffers` array instead of `value`. The endpoint declares this with `pageItemsKey: "privateOffers"` in the catalog, so `call privateOffers.list` also follows every page.

```sh
partner-center-cli private-offers list
partner-center-cli call privateOffers.list
```

The Product Ingestion API requests tokens for `https://graph.microsoft.com`. See the [Product Ingestion API docs](https://learn.microsoft.com/en-us/partner-center/marketplace-offers/product-ingestion-api).

## Setup

Requires Node.js 20 or newer.

```sh
npm install
npm run build
```

## Configuration

Settings are read from a `.env` file in the current directory using [dotenv](https://github.com/motdotla/dotenv). Copy `.env.example` to `.env` and fill it in. `.env` is gitignored.

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

## Authentication

`AuthManager` in `src/auth/manager.ts` signs in with the client credentials grant. It posts `resource`, `client_id`, `client_secret`, and `grant_type=client_credentials` to `https://login.microsoftonline.com/{tenantId}/oauth2/token`, then caches the token until five minutes before it expires.

| URL | Used for |
| --- | --- |
| `https://login.microsoftonline.com` | Login base URL (`DEFAULT_LOGIN_BASE_URL`) |
| `https://api.partnercenter.microsoft.com` | Default `resource` (`DEFAULT_RESOURCE`) |

`call` requests a token for the `resource` declared on the endpoint's service, or the default when the service doesn't declare one. To test sign-in on its own:

```sh
partner-center-cli auth                                          # show the token expiry
partner-center-cli auth --print-token                            # also write the token to stdout
partner-center-cli auth --resource https://api.example.com       # request a token for another resource
```

## Commands

```sh
partner-center-cli endpoints [--group <group>] [--method GET] [--json]
partner-center-cli describe <id>
partner-center-cli url <id> --param name=value --query name=value [--allow-query]
partner-center-cli call <id> --param name=value --query name=value [--allow-query] [--body <json> | --body-file <path>] [--dry-run] [--all] [--timeout <seconds>]
```

`url` only prints the resolved URL. `call` sends it. The response body is written to stdout; the request line, status, `MS-RequestId`, and `MS-CorrelationId` are written to stderr. For paged endpoints, and with `--all`, stderr instead gets one `GET` line per page and a `Pages: N, items: M` summary, and stdout gets every item merged into one `{ "value": [...] }` object. `--timeout` defaults to 60 seconds.

`--allow-query` sends a query parameter that is not declared on the endpoint. `--base-url` replaces the service base URL, including its path, for a single command.

## Add an API

1. Register the service in `src/urls/bases.ts`:

   ```ts
   export const services = {
     example: {
       description: "Example API",
       defaultBaseUrl: "https://api.example.com", // may include a path
       baseUrlEnv: "EXAMPLE_BASE_URL", // optional override read from .env
       resource: "https://api.example.com", // optional token audience; defaults to DEFAULT_RESOURCE
     },
   } as const satisfies Record<string, ServiceDefinition>;
   ```

2. Add endpoints to `src/urls/endpoints.ts`, wrapping each in `endpoint(...)`:

   ```ts
   export const endpoints: readonly Endpoint[] = [
     endpoint({
       id: "items.get",
       group: "items",
       method: "GET",
       summary: "Get one item.",
       path: "/v1/items/{itemId}",
       service: services.example,
       pathParams: [{ name: "itemId", description: "Item id." }],
       queryParams: [],
     }),
   ];
   ```

   The `id` must start with `{group}.`, every `{placeholder}` needs a matching `pathParams` entry, query fields are declared on `queryParams` instead of in the path, and the service's base URL must be a valid https URL. These are checked when the catalog loads.

   For collection endpoints, set `paged: true` so `call` follows `@nextLink`. If the pages hold their items in a property other than `value`, name it with `pageItemsKey`.
