import { Command, Option } from "commander";
import { AuthManager, DEFAULT_RESOURCE } from "../auth/manager.js";
import type { EndpointService } from "../services/endpoint-service.js";
import type { RequestService } from "../services/request-service.js";
import { getEndpoint, type HttpMethod } from "../urls/index.js";
import { collect, globalsFrom } from "./options.js";

const METHODS: readonly HttpMethod[] = ["GET", "POST", "PATCH", "PUT", "DELETE"];

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

export class ProgramCommandBuilder {
    
    private readonly program: Command;
    
    constructor(
        private readonly endpointService: EndpointService,
        private readonly requestService: RequestService,
    ) {
        this.program = new Command();
    }

    public getProgramCommand(): Command {

        this.addApiExplorerCommand();
        this.addEndpointsCommand();
        this.addAuthCommand();
        this.addDescribeCommand();
        this.addUrlCommand();
        this.addCallCommand();
        this.addHelpText();
        
        return this.program;
    }

    private addApiExplorerCommand(): void {
        this.program
            .name("api-explorer")
            .description("Explore REST APIs from a catalog of endpoints")
            .version("0.1.0")
            .option("--base-url <url>", "https origin to use instead of the service base URL")
            .addOption(
            new Option("--locale <locale>", "value for the X-Locale header")
                .env("PARTNER_CENTER_LOCALE")
                .default("en-US"),
            );
    }

    private addEndpointsCommand(): void {
        this.program
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
                    this.endpointService.printEndpointJson(filter);
                    return;
                }
                this.endpointService.printEndpointList(filter);
            });
    }

    private addAuthCommand(): void {
        this.program
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
    }

    private addDescribeCommand(): void {
        this.program
            .command("describe")
            .description("Show one endpoint's path, parameters, and docs")
            .argument("<id>", "endpoint id")
            .action((id: string) => {
                this.endpointService.printEndpoint(getEndpoint(id));
            });
    }

    private addUrlCommand(): void {
        this.withRequestOptions(
            this.program
                .command("url")
                .description("Print the URL for an endpoint")
                .argument("<id>", "endpoint id"),
        ).action((id: string, options: RequestOptions, command: Command) => {
            const globals = globalsFrom(command);
            const url = this.requestService.resolveEndpointUrl({
                id,
                ...(globals.baseUrl !== undefined ? { baseUrl: globals.baseUrl } : {}),
                params: options.param,
                query: options.query,
                strictQuery: !options.allowQuery,
            });
            console.log(url.toString());
        });
    }

    private addCallCommand(): void {
        this.withRequestOptions(
            this.program
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
            await this.requestService.callEndpoint({
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
    }

    private addHelpText(): void {
        this.program.addHelpText(
            "after",
            `
Examples:
  api-explorer auth
  api-explorer endpoints
  api-explorer describe <id>
  api-explorer url <id> --param name=value --query name=value
  api-explorer call <id> --query name=value
  api-explorer call products.list
  api-explorer products list
  api-explorer products get <productId> --target-type preview
  api-explorer products getSchemas <productId> --target-type preview
  api-explorer products getResourceIds <productId> --schema Plan
  api-explorer products getResources <productId> --schema Plan

Register APIs in src/urls/bases.ts and add operations in src/urls/catalog.ts.
The URL builder checks each path template against its declared parameters.
`,
        );
    }

    private withRequestOptions(command: Command): Command {
        return command
            .option("--param <name=value>", "path parameter (repeatable)", collect, [])
            .option("--query <name=value>", "query parameter (repeatable)", collect, [])
            .option("--allow-query", "send query parameters that are not in the catalog");
    }
}
