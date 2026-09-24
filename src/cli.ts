import { Command, Option } from "commander";
import { printEndpoint, printEndpointJson, printEndpointList } from "./commands/endpoints.js";
import { callEndpoint, resolveEndpointUrl } from "./commands/request.js";
import { assertCloud, getEndpoint, type HttpMethod } from "./urls/index.js";

const METHODS: readonly HttpMethod[] = ["GET", "POST", "PATCH", "PUT", "DELETE"];

export function createProgram(): Command {
  const program = new Command();

  program
    .name("partner-center")
    .description("Explore Microsoft Partner Center REST APIs")
    .version("0.1.0")
    .option("--cloud <cloud>", "published cloud: global or china", "global")
    .option("--base-url <url>", "https origin to use instead of the cloud base URL")
    .option("--token <token>", "access token (defaults to PARTNER_CENTER_ACCESS_TOKEN)")
    .option("--locale <locale>", "value for the X-Locale header", "en-US");

  program
    .command("endpoints")
    .description("List catalog endpoints")
    .option("--group <group>", "filter by group, such as customers or products")
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
    .command("describe")
    .description("Show one endpoint's path, parameters, and docs")
    .argument("<id>", "endpoint id, such as customers.list")
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
      .argument("<id>", "endpoint id, such as customers.list"),
  ).action((id: string, options: RequestOptions, command: Command) => {
    const globals = globalsFrom(command);
    const url = resolveEndpointUrl({
      id,
      cloud: globals.cloud,
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
      .argument("<id>", "endpoint id, such as customers.list")
      .option("--body <json>", "JSON request body")
      .option("--body-file <path>", "file containing the JSON request body")
      .option("--dry-run", "print the request line without sending it")
      .option("--timeout <seconds>", "request timeout in seconds", "60"),
  ).action(async (id: string, options: CallOptions, command: Command) => {
    const globals = globalsFrom(command);
    const timeoutSeconds = Number(options.timeout);
    if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {
      throw new Error("--timeout must be a positive number of seconds.");
    }
    await callEndpoint({
      id,
      cloud: globals.cloud,
      ...(globals.baseUrl !== undefined ? { baseUrl: globals.baseUrl } : {}),
      params: options.param,
      query: options.query,
      strictQuery: !options.allowQuery,
      ...(globals.token !== undefined ? { token: globals.token } : {}),
      locale: globals.locale,
      ...(options.body !== undefined ? { body: options.body } : {}),
      ...(options.bodyFile !== undefined ? { bodyFile: options.bodyFile } : {}),
      dryRun: options.dryRun === true,
      timeoutMs: timeoutSeconds * 1000,
    });
  });

  program.addHelpText(
    "after",
    `
Examples:
  partner-center endpoints
  partner-center describe customers.list
  partner-center url customers.list --query size=40
  partner-center call products.list --query country=US --query targetView=OnlineServices

Add operations in src/urls/catalog.ts. The URL builder checks each path template
against its declared parameters.
`,
  );

  return program;
}

interface GlobalOptions {
  cloud: string;
  baseUrl?: string;
  token?: string;
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
  timeout: string;
}

function globalsFrom(command: Command): {
  cloud: ReturnType<typeof assertCloud>;
  baseUrl?: string;
  token?: string;
  locale: string;
} {
  const options = command.optsWithGlobals() as GlobalOptions;
  return {
    cloud: assertCloud(options.cloud),
    ...(options.baseUrl !== undefined ? { baseUrl: options.baseUrl } : {}),
    ...(options.token !== undefined ? { token: options.token } : {}),
    locale: options.locale,
  };
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}
