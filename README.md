# partner-center-cli

Command line tool for exploring Microsoft Marketplace Partner Center REST APIs. 

This tool is for developers who want to better understand the Partner Center APIs. There are several APIs that expose the full capabilities of Partner Center. This sample uses the Partner Center Ingestion API.

It is implemented in TypeScript and there isn't much reason to run it with any command other than `npm run dev` as it's just a simple reference application.

## Setting up Partner Center to run this script

Before running this script, you must add a Microsoft Entra ID applicaiton in Partner Center.
Reference the [offical Microsoft documentation on](https://learn.microsoft.com/en-us/partner-center/marketplace-offers/product-ingestion-api) how to do this.

Collect the information needed for the ENV VARs as you go. Especially ensure you keep a copy of the key (secret).

## Script setup and run

Requires Node.js 20 or newer.

```sh
npm install
npm run dev help 
```

`npm run dev help` gives you all command line options in the CLI. Use help to explore all the commands.

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

Put `--` after `dev` so npm passes flags such as `--query` through to the CLI instead of reading them itself:

```sh
npm run dev -- endpoints
npm run dev -- call <id> --query name=value
```

# Sample usage

- Get all products (offers) in your Partner Center account:

  `npm run dev call products.list`

- Get details about a specific product returned from the previous command:

  `npm run dev products get c322a73a-5320-4ce8-b3b6-c5236225fdae`

- Get all the resources the make up the product in the draft stage:

  `npm run dev -- products getResources c322a73a-5320-4ce8-b3b6-c5236225fdad --target-type draft`

- Change the alias of a product (offer) in Partner Center:
  
  `npm run dev products rename c322a73a-5320-4ce8-b3b6-c5236225fdae 'New Offer Name'`