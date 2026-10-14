# partner-center-cli

Command line tool for exploring Microsoft Marketplace Partner Center REST APIs.

This tool is for developers who want to better understand the Partner Center APIs. There are several APIs that expose the full capabilities of Partner Center. This sample uses the Partner Center Product Ingestion API.

It is implemented in TypeScript. For local development, run commands with `npm run dev`. After `npm run build`, use `npm start` or the `partner-center-cli` bin.

## Setting up Partner Center to run this script

Before running this script, you must add a Microsoft Entra ID application in Partner Center.
See the [official Microsoft documentation on the Product Ingestion API](https://learn.microsoft.com/en-us/partner-center/marketplace-offers/product-ingestion-api) for how to do this.

Collect the information needed for the environment variables as you go. Especially ensure you keep a copy of the client secret.

## Script setup and run

Requires Node.js 20 or newer.

```sh
npm install
npm run dev -- help
```

`npm run dev -- help` lists top-level commands. Use `help` on any command group for subcommands, for example `npm run dev -- products help`.

Put `--` after `dev` so npm passes flags such as `--query` through to the CLI instead of reading them itself:

```sh
npm run dev -- endpoints
npm run dev -- call products.list --query type=softwareAsAService
```

## Environment variables

Settings may be read from a `.env` file in the project root directory. Copy `.env.example` to `.env` and fill it in. `.env` is gitignored.

| Variable | Flag | Default |
| --- | --- | --- |
| `PARTNER_CENTER_TENANT_ID` | none | none |
| `PARTNER_CENTER_CLIENT_ID` | none | none |
| `PARTNER_CENTER_CLIENT_SECRET` | none | none |
| `PRODUCT_INGESTION_BASE_URL` | `--base-url` | `https://graph.microsoft.com/rp/product-ingestion` |
| `SCHEMA_BASE_URL` | none | `https://schema.mp.microsoft.com` |
| `PARTNER_CENTER_LOCALE` | `--locale` | `en-US` |

A flag overrides the environment. A variable already set in your shell overrides `.env`. Blank entries count as unset.

### Global options

These apply to most commands:

- `--base-url <url>` — HTTPS origin for Product Ingestion (overrides `PRODUCT_INGESTION_BASE_URL`)
- `--locale <locale>` — `X-Locale` header (default `en-US`, env `PARTNER_CENTER_LOCALE`)

## Commands

### API explorer

| Command | Description |
| --- | --- |
| `auth [--resource <uri>] [--print-token]` | Sign in with client credentials and show token expiry |
| `endpoints [--group <group>] [--method <method>] [--json]` | List catalog endpoints |
| `describe <id>` | Show one endpoint's path, parameters, and docs |
| `url <id> [--param name=value] [--query name=value] [--allow-query]` | Print the URL for an endpoint |
| `call <id> [--param ...] [--query ...] [--body <json>] [--body-file <path>] [--dry-run] [--all] [--timeout <seconds>] [--allow-query]` | Call an endpoint and print the response body |

Paged catalog endpoints (such as `products.list`) follow `@nextLink` automatically unless you use `--dry-run`.

### `products`

Work with products through the Product Ingestion resource tree. Product commands that read a tree accept `--target-type <draft\|preview\|live>` (default **preview** when omitted).

| Command | Description |
| --- | --- |
| `products list` | List all products |
| `products get <productId> [--target-type <type>]` | Fetch one product and all resources (prints target summary on stderr) |
| `products getSchemas <productId> [--target-type <type>]` | List each resource's `$schema`, one per line |
| `products getResourceIds <productId> [--target-type <type>] [--schema <name>]` | List resource ids, one per line |
| `products getResources <productId> [--target-type <type>] [--schema <name>]` | Print matching resources as JSON Lines |
| `products rename <productId> <alias>` | Post a new product alias via configure (polls job until complete) |

For `--schema`, `<name>` is a marketplace schema key (for example `Plan`, `Product`, `Listing`). Run `products getSchemas` on a product to see full `$schema` URLs.

`<productId>` may be with or without the `product/` prefix (except `rename`, which expects the id without the prefix).

### `private-offers`

| Command | Description |
| --- | --- |
| `private-offers list` | List private offers, including multiparty offers |
| `private-offers get <id>` | Get one private offer by id |
| `private-offers create <name>` | Create a private offer (polls configure job until complete) |
| `private-offers delete <id>` | Mark a private offer deleted via configure (polls job until complete) |

### `jobs`

| Command | Description |
| --- | --- |
| `jobs get <id>` | Get configure job status by job id |

## Sample usage

List products (catalog API):

```sh
npm run dev -- call products.list
```

Or use the products helper:

```sh
npm run dev -- products list
```

Fetch a product resource tree (preview target):

```sh
npm run dev -- products get c322a73a-5320-4ce8-b3b6-c5236225fdae
npm run dev -- products get c322a73a-5320-4ce8-b3b6-c5236225fdae --target-type preview
```

List only plan resources:

```sh
npm run dev -- products getResources c322a73a-5320-4ce8-b3b6-c5236225fdae --schema Plan
```

Rename a product (offer) alias:

```sh
npm run dev -- products rename c322a73a-5320-4ce8-b3b6-c5236225fdae 'New Offer Name'
```

Private offers:

```sh
npm run dev -- private-offers list
npm run dev -- private-offers get <privateOfferId>
```

Inspect a catalog endpoint URL:

```sh
npm run dev -- url product.get --param productId=c322a73a-5320-4ce8-b3b6-c5236225fdae --query targetType=preview
```

Register APIs in `src/urls/bases.ts` and add operations in `src/urls/endpoints.ts`. The URL builder checks each path template against its declared parameters.
