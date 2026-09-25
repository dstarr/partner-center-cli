# api-explorer

Command line tool for exploring REST APIs. Requests are chosen from a catalog of endpoints, so URLs are built from one path template instead of being assembled at each call site.

## Supported endpoints

| Id | Request | Service |
| --- | --- | --- |
| `products.list` | `GET {PRODUCT_INGESTION_BASE_URL}/product?$version={schema-version}` | Product Ingestion API |
| `product.get` | `GET {PRODUCT_INGESTION_RESOURCE_TREE_BASE_URL}/product/{productId}?targetType={target}&$version={schema-version}` | Product Ingestion API |

`products.list` returns all products defined by the publisher. `$version` defaults to `2022-03-01-preview3`. Results are paged. The endpoint is marked `paged: true` in the catalog, so `call` follows `@nextLink` automatically and returns every product in one `value` array:

```sh
api-explorer call products.list
api-explorer call products.list --query type=softwareAsAService
api-explorer call products.list --query '$version=2022-03-01-preview3'   # quote $ names in the shell
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
api-explorer products list
api-explorer products get product/27494b66-e9d3-4b2d-848b-5ce0543abd90 --target-type preview
api-explorer products getSchemas product/27494b66-e9d3-4b2d-848b-5ce0543abd90 --target-type preview   # one $schema per line
api-explorer products resourceIds product/27494b66-e9d3-4b2d-848b-5ce0543abd90   # one resource id per line
api-explorer products resourceIds product/27494b66-e9d3-4b2d-848b-5ce0543abd90 --schema Plan   # only plan ids
```

Microsoft's docs show `targetType="preview"` with quotes, but the API rejects quoted values, so the value is sent without them. `live` returns HTTP 400 for a product that has never been published.

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
api-explorer auth                                          # show the token expiry
api-explorer auth --print-token                            # also write the token to stdout
api-explorer auth --resource https://api.example.com       # request a token for another resource
```

## Commands

```sh
api-explorer endpoints [--group <group>] [--method GET] [--json]
api-explorer describe <id>
api-explorer url <id> --param name=value --query name=value
api-explorer call <id> --param name=value --query name=value [--body <json> | --body-file <path>] [--dry-run] [--all]
```

`url` only prints the resolved URL. `call` sends it. The response body is written to stdout; the request line, status, `MS-RequestId`, and `MS-CorrelationId` are written to stderr.

`--allow-query` sends a query parameter that is not declared on the endpoint. `--base-url` replaces the service host for a single command.

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

2. Add endpoints to `src/urls/catalog.ts`, wrapping each in `endpoint(...)`:

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

   Every `{placeholder}` needs a matching `pathParams` entry, query fields are declared on `queryParams`, and `service` must be registered. These are checked when the catalog loads.
