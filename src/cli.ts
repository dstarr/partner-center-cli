import { Command, Option } from "commander";
import { printEndpoint, printEndpointJson, printEndpointList } from "./commands/endpoints.js";
import { callEndpoint, reportFailure, resolveEndpointUrl } from "./commands/request.js";
import { ApiError } from "./http/pages.js";
import { ProductsService, TARGET_TYPES, type TargetType } from "./services/ProductsService.js";
import { AuthManager, DEFAULT_RESOURCE } from "./auth/manager.js";
import { getEndpoint, type HttpMethod } from "./urls/index.js";

const METHODS: readonly HttpMethod[] = ["GET", "POST", "PATCH", "PUT", "DELETE"];

export function createProgram(): Command {
  const program = new Command();

  program
    .name("api-explorer")
    .description("Explore REST APIs from a catalog of endpoints")
    .version("0.1.0")
    .option("--base-url <url>", "https origin to use instead of the service base URL")
    .addOption(
      new Option("--locale <locale>", "value for the X-Locale header")
        .env("PARTNER_CENTER_LOCALE")
        .default("en-US"),
    );

  program
    .command("endpoints")
    .description("List catalog endpoints")
    .option("--group <group>", "filter by group")
    .addOption(new Option("--method <method>", "filter by HTTP method").choices([...METHODS]))
    .option("--json", "print the catalog as JSON")
    .action((options: { group?: string; method?: HttpMethod; json?: boolean }) => {
      const filter = {
        ...(options.group !== undefined ? { group: options.group } : {}),
        ...(options.method !== undefined ? { method: options.method } : {}),
      };
      if (options.json) {
        printEndpointJson(filter);
        return;
      }
      printEndpointList(filter);
    });

  program
    .command("auth")
    .description("Sign in with the client credentials in .env and show the token expiry")
    .option("--resource <uri>", "resource (token audience) to request a token for", DEFAULT_RESOURCE)
    .option("--print-token", "write the access token to stdout")
    .action(async (options: { resource: string; printToken?: boolean }) => {
      const auth = AuthManager.fromEnv(process.env, { resource: options.resource });
      console.error(`POST ${auth.loginUrl}`);
      const token = await auth.getToken();
      console.error(`Token type: ${token.tokenType}`);
      console.error(`Resource: ${token.resource}`);
      console.error(`Expires: ${token.expiresAt.toISOString()}`);
      console.error(`client-request-id: ${token.clientRequestId}`);
      if (options.printToken) {
        console.log(token.accessToken);
      }
    });

  const offers = program.command("offers").description("Work with products (offers) through the ProductsService");
  offers
    .command("list")
    .description("Fetch every product the publisher has defined")
    .action(async (_options: unknown, command: Command) => {
      const globals = globalsFrom(command);
      const manager = new ProductsService({
        ...(globals.baseUrl !== undefined ? { baseUrl: globals.baseUrl } : {}),
        locale: globals.locale,
      });
      try {
        const products = await manager.getAllProducts();
        console.error(`Products: ${products.length}`);
        console.log(JSON.stringify(products, null, 2));
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw error;
        }
        reportFailure(error.response);
      }
    });

  offers
    .command("get")
    .description("Fetch one product and all of its resources")
    .argument("<productId>", "product durable id, with or without the product/ prefix")
    .addOption(
      new Option("--target-type <type>", "environment to read (default: draft)").choices([...TARGET_TYPES]),
    )
    .action(async (productId: string, options: { targetType?: TargetType }, command: Command) => {
      const globals = globalsFrom(command);
      const manager = new ProductsService({
        ...(globals.baseUrl !== undefined ? { baseUrl: globals.baseUrl } : {}),
        locale: globals.locale,
      });
      try {
        const tree = await manager.getProduct(
          productId,
          options.targetType !== undefined ? { targetType: options.targetType } : {},
        );
        console.error(`Target: ${tree.target?.targetType}, resources: ${tree.resources?.length ?? 0}`);
        console.log(JSON.stringify(tree, null, 2));
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw error;
        }
        reportFailure(error.response);
      }
    });

  program
    .command("describe")
    .description("Show one endpoint's path, parameters, and docs")
    .argument("<id>", "endpoint id")
    .action((id: string) => {
      printEndpoint(getEndpoint(id));
    });

  const requestOptions = (command: Command): Command =>
    command
      .option("--param <name=value>", "path parameter (repeatable)", collect, [])
      .option("--query <name=value>", "query parameter (repeatable)", collect, [])
      .option("--allow-query", "send query parameters that are not in the catalog");

  requestOptions(
    program
      .command("url")
      .description("Print the URL for an endpoint")
      .argument("<id>", "endpoint id"),
  ).action((id: string, options: RequestOptions, command: Command) => {
    const globals = globalsFrom(command);
    const url = resolveEndpointUrl({
      id,
      ...(globals.baseUrl !== undefined ? { baseUrl: globals.baseUrl } : {}),
      params: options.param,
      query: options.query,
      strictQuery: !options.allowQuery,
    });
    console.log(url.toString());
  });

  requestOptions(
    program
      .command("call")
      .description("Call an endpoint and print the response body")
      .argument("<id>", "endpoint id")
      .option("--body <json>", "JSON request body")
      .option("--body-file <path>", "file containing the JSON request body")
      .option("--dry-run", "print the request line without sending it")
      .option("--all", "follow @nextLink and merge every page's value array (automatic for paged endpoints)")
      .option("--timeout <seconds>", "request timeout in seconds", "60"),
  ).action(async (id: string, options: CallOptions, command: Command) => {
    const globals = globalsFrom(command);
    const timeoutSeconds = Number(options.timeout);
    if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {
      throw new Error("--timeout must be a positive number of seconds.");
    }
    await callEndpoint({
      id,
      ...(globals.baseUrl !== undefined ? { baseUrl: globals.baseUrl } : {}),
      params: options.param,
      query: options.query,
      strictQuery: !options.allowQuery,
      locale: globals.locale,
      ...(options.body !== undefined ? { body: options.body } : {}),
      ...(options.bodyFile !== undefined ? { bodyFile: options.bodyFile } : {}),
      dryRun: options.dryRun === true,
      all: options.all === true,
      timeoutMs: timeoutSeconds * 1000,
    });
  });

  program.addHelpText(
    "after",
    `
Examples:
  api-explorer auth
  api-explorer endpoints
  api-explorer describe <id>
  api-explorer url <id> --param name=value --query name=value
  api-explorer call <id> --query name=value
  api-explorer call products.list
  api-explorer offers list
  api-explorer offers get <productId> --target-type preview

Register APIs in src/urls/bases.ts and add operations in src/urls/catalog.ts.
The URL builder checks each path template against its declared parameters.
`,
  );

  return program;
}

interface GlobalOptions {
  baseUrl?: string;
  locale: string;
}

interface RequestOptions {
  param: string[];
  query: string[];
  allowQuery?: boolean;
}

interface CallOptions extends RequestOptions {
  body?: string;
  bodyFile?: string;
  dryRun?: boolean;
  all?: boolean;
  timeout: string;
}

function globalsFrom(command: Command): GlobalOptions {
  const options = command.optsWithGlobals() as GlobalOptions;
  const baseUrl = nonEmpty(options.baseUrl);
  return {
    ...(baseUrl !== undefined ? { baseUrl } : {}),
    locale: nonEmpty(options.locale) ?? "en-US",
  };
}

/** Blank entries in .env arrive as empty strings; treat them as unset. */
function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}
