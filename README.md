# partner-center

Command line tool for exploring the Microsoft Partner Center REST APIs. Requests are chosen from a catalog of endpoints, so URLs are built from one path template instead of being assembled at each call site.

## Setup

Requires Node.js 20 or newer.

```sh
npm install
npm run build
```

During development you can skip the build:

```sh
npm run dev -- endpoints
```

## Explore the catalog

```sh
partner-center endpoints
partner-center endpoints --group products
partner-center describe customers.list
partner-center url customers.list --query size=40
partner-center url customers.get --param customerId=aaaabbbb-0000-cccc-1111-dddd2222eeee
```

`url` only prints the resolved URL. `call` sends it:

```sh
export PARTNER_CENTER_ACCESS_TOKEN="<bearer token>"
partner-center call customers.list --query size=40
partner-center call products.list --query country=US --query targetView=OnlineServices
```

The response body is written to stdout. The request line, status, `MS-RequestId`, and `MS-CorrelationId` are written to stderr.

```sh
partner-center call customers.list --query size=40 --dry-run
partner-center call customers.get --param customerId=<guid> --cloud china
partner-center url profiles.organization.get --base-url https://example.test
```

`--allow-query` sends a query parameter that is not declared on the endpoint. Use that when trying a filter the catalog does not list yet.

## Hosts

Base URLs come from the [Partner Center REST URLs](https://learn.microsoft.com/en-us/partner-center/developer/partner-center-rest-urls) table and live in `src/urls/bases.ts`.

| Cloud | Service | Base URL |
| --- | --- | --- |
| global | partnerCenter | `https://api.partnercenter.microsoft.com` |
| china | partnerCenter | `https://partner.partnercenterapi.microsoftonline.cn` |
| global | partner (pricing and referrals) | `https://api.partner.microsoft.com` |

`--cloud` selects the published host. `--base-url` replaces it with another https origin.

## Add an endpoint

Add an entry to `src/urls/catalog.ts`. The path is a template such as `/v1/customers/{customerId}`. Every `{placeholder}` needs a matching `pathParams` entry, and query fields are declared on `queryParams`. The catalog checks that those agree when it loads.

The seeded catalog covers profiles, customers, subscriptions, orders, products, and invoices. It is a starting set for exploration, not the full Partner Center surface.
