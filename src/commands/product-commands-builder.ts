import { Option, type Command } from "commander";
import { TARGET_TYPES, ProductsService, type TargetType } from "../services/products-service.js";
import { ProductParser } from "../services/products-parser.js";
import { MarketplaceSchemasRegistry, type MarketplaceSchema } from "../schemas/marketplace-schemas.js";
import { ConfigureJobPoller } from "../services/configure-job-poller.js";
import type { ConfigureJob } from "../services/job-service.js";

export class ProductCommandsBuilder {
    private readonly productsService: ProductsService;
    private readonly productParser: ProductParser;
    private readonly jobPoller: ConfigureJobPoller;

    public constructor() {
        this.productsService = new ProductsService();
        this.productParser = new ProductParser();
        this.jobPoller = new ConfigureJobPoller();
    }

    public addProductCommands(program: Command): void {

        const productsCommand = program.command("products").description("Work with products through the ProductsService");

        this.getProductCommand(productsCommand);
        this.getProductResourceIdsCommand(productsCommand);
        this.getProductResourcesCommand(productsCommand);
        this.getProductSchemasCommand(productsCommand);
        this.listProductsCommand(productsCommand);
        this.renameProductCommand(productsCommand);
    }
    
    private listProductsCommand(productsCommand: Command): void {
        productsCommand.command("list")
            .description("List all products")
            .action(async () => {
                const products = await this.productsService.getAllProducts();
                console.log(JSON.stringify(products, null, 2));
            });
    }

    private getProductSchemasCommand(productsCommand: Command): void {
        productsCommand.command("getSchemas")
            .description("List the $schema of the product and each of its resources, one per line")
            .argument("<productId>", "product durable id, with or without the product/ prefix")
            .addOption(
                new Option("--target-type <type>", "environment to read (default: preview)")
                    .choices([...TARGET_TYPES])
                    .default("draft")
            )
            .action(async (productId: string, options: { targetType?: TargetType; }) => {
                const target = options.targetType !== undefined ? { targetType: options.targetType } : {};
                const schemas = await this.productsService.getProductResourceSchemas(productId, target);
                console.log(schemas.join("\n"));
            });
    }

    private getProductCommand(productsCommand: Command): void {
        productsCommand
            .command("get")
            .description("Fetch one product and all of its resources")
            .argument("<productId>", "product durable id, with or without the product/ prefix")
            .addOption(
                new Option("--target-type <type>", "Partner Center environment to read from")
                    .choices([...TARGET_TYPES])
                    .default("draft")
            )
            .action(async (productId: string, options: { targetType?: TargetType; }) => {
                const target = options.targetType !== undefined ? { targetType: options.targetType } : {};
                const tree = await this.productsService.getProduct(productId, target);
                console.error(`Target: ${tree.target?.targetType}, resources: ${tree.resources?.length ?? 0}`);
                console.log(JSON.stringify(tree, null, 2));
            });
    }

    private getProductResourcesCommand(productsCommand: Command): void {
        productsCommand
            .command("getResources")
            .description("Print each resource in the product as one line of JSON (JSON Lines)")
            .argument("<productId>", "product durable id, with or without the product/ prefix")
            .addOption(
                new Option("--target-type <type>", "Partner Center environment to read from")
                    .choices([...TARGET_TYPES])
                    .default("draft")
            )
            .addOption(
                new Option("--schema <name>", "only resources that use this schema")
                    .choices([...Object.keys(MarketplaceSchemasRegistry.Schemas)])
            )
            .action(
                async (
                    productId: string,
                    options: { targetType?: TargetType; schema?: MarketplaceSchema; },
                ) => {
                    const target = options.targetType !== undefined ? { targetType: options.targetType } : {};
                    const product = await this.productsService.getProduct(productId, target);
                    const schema = options.schema !== undefined ? MarketplaceSchemasRegistry.Schemas[options.schema] : undefined;
                    for (const resource of this.productParser.getResources(product, schema)) {
                        console.log(resource);
                    }
                }
            );
    }

    private getProductResourceIdsCommand(productsCommand: Command): void {
        productsCommand
            .command("getResourceIds")
            .description("List the ids of the product and each of its resources, one per line")
            .argument("<productId>", "product durable id, with or without the product/ prefix")
            .addOption(new Option("--target-type <type>", "environment to read (default: preview)")
                .choices([...TARGET_TYPES]))
            .addOption(new Option("--schema <name>", "only resources that use this schema")
                .choices([...Object.keys(MarketplaceSchemasRegistry.Schemas)]))
            .action(async (productId: string, options: { targetType?: TargetType; schema?: MarketplaceSchema; }) => {
                const target = options.targetType !== undefined ? { targetType: options.targetType } : {};
                const product = await this.productsService.getProduct(productId, target);
                const schema = options.schema !== undefined ? MarketplaceSchemasRegistry.Schemas[options.schema] : undefined;
                for (const id of this.productParser.getResourceIds(product, schema)) {
                    console.log(id);
                }
            });
    }

    private renameProductCommand(productsCommand: Command): void {
        productsCommand.command("rename")
            .description("Post a new alias for a product")
            .argument("<productId>", "product durable id, without the product/ prefix")
            .argument("<alias>", "new alias for the product")
            .action(async (productId: string, alias: string) => {
                const result = await this.productsService.renameProduct(productId, alias);
                const job = JSON.parse(result) as ConfigureJob;
                await this.jobPoller.pollUntilComplete(job);
            });
    }
}
