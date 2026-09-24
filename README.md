# api-explorer

Command line tool for exploring REST APIs. Requests are chosen from a catalog of endpoints, so URLs are built from one path template instead of being assembled at each call site.

The catalog is currently empty. Register an API and add its endpoints as described below.

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
api-explorer call <id> --param name=value --query name=value [--body <json> | --body-file <path>] [--dry-run]
```

`url` only prints the resolved URL. `call` sends it. The response body is written to stdout; the request line, status, `MS-RequestId`, and `MS-CorrelationId` are written to stderr.

`--allow-query` sends a query parameter that is not declared on the endpoint. `--base-url` replaces the service host for a single command.

## Add an API

1. Register the service in `src/urls/bases.ts`:

   ```ts
   export const services: Readonly<Record<ServiceId, ServiceDefinition>> = {
     example: {
       description: "Example API",
       defaultBaseUrl: "https://api.example.com",
       baseUrlEnv: "EXAMPLE_BASE_URL", // optional override read from .env
       resource: "https://api.example.com", // optional token audience; defaults to DEFAULT_RESOURCE
     },
   };
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
       service: "example",
       pathParams: [{ name: "itemId", description: "Item id." }],
       queryParams: [],
     }),
   ];
   ```

   Every `{placeholder}` needs a matching `pathParams` entry, query fields are declared on `queryParams`, and `service` must be registered. These are checked when the catalog loads.
